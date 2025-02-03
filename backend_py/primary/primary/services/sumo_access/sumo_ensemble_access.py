from typing import TypeVar, Type, List
import logging
import asyncio
import pyarrow as pa

from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects._search_context import SearchContext, filters
from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from primary.services.service_exceptions import Service, NoDataError, MultipleDataMatchesError
from ._helpers import create_sumo_client


LOGGER = logging.getLogger(__name__)

T = TypeVar("T", bound="SumoEnsembleAccess")


class AsyncSearchContext(SearchContext):
    def __init__(
        self,
        sumo: SumoClient,
        must: List = [],
        must_not: List = [],
        hidden=False,
        visible=True,
    ):
        super().__init__(sumo, must=must, must_not=must_not, hidden=hidden, visible=visible)

    async def aggregation_async(self, column=None, operation=None):
        assert operation is not None
        assert column is None or isinstance(column, str)
        sc = self.filter(aggregation=operation, column=column)
        length = await sc.length_async()
        print("**************************************************", length)
        if length == 1:
            return await sc.getitem_async(0)
        else:
            return await self.filter(realization=True).aggregate_async(
                columns=[column] if column is not None else None,
                operation=operation,
            )

    async def aggregate_async(self, columns=None, operation=None):
        hidden_length = await self.hidden.length_async()
        print("**************************************************", hidden_length, columns, operation)
        if hidden_length > 0:
            return await self.hidden._aggregate_async(columns=columns, operation=operation)
        else:
            return await self.visible._aggregate_async(columns=columns, operation=operation)

    def filter(self, **kwargs) -> "AsyncSearchContext":
        """Filter AsyncSearchContext"""

        must = self._must[:]
        must_not = self._must_not[:]
        for k, v in kwargs.items():
            f = filters.get(k)
            if f is None:
                raise Exception(f"Don't know how to generate filter for {k}")
                pass
            _must, _must_not = f(v)
            if _must:
                must.append(_must)
            if _must_not is not None:
                must_not.append(_must_not)

        sc = AsyncSearchContext(
            self._sumo,
            must=must,
            must_not=must_not,
            hidden=self._hidden,
            visible=self._visible,
        )

        if "has" in kwargs:
            # Get list of cases matched by current filter set
            uuids = sc._get_field_values("fmu.case.uuid.keyword")
            # Generate new AsyncSearchContext for objects that match the uuids
            # and also satisfy the "has" filter
            sc = AsyncSearchContext(
                self._sumo,
                must=[
                    {"terms": {"fmu.case.uuid.keyword": uuids}},
                    kwargs["has"],
                ],
            )
            uuids = sc._get_field_values("fmu.case.uuid.keyword")
            sc = AsyncSearchContext(
                self._sumo,
                must=[{"ids": {"values": uuids}}],
            )

        return sc


class SumoEnsembleAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context: SearchContext | None = None

    @classmethod
    def from_case_uuid_and_ensemble_name(cls: Type[T], access_token: str, case_uuid: str, iteration_name: str) -> T:
        sumo_client: SumoClient = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_ensemble_context(self) -> AsyncSearchContext:
        """
        Get the ensemble context, creating it if necessary.

        Returns:
            AsyncSearchContext: The context for the current ensemble

        Raises:
            NoDataError: If unable to create or retrieve ensemble context
        """
        if self._ensemble_context is None:
            try:
                search_context = AsyncSearchContext(sumo=self._sumo_client)
                # case_context = await search_context.get_case_by_uuid_async(self._case_uuid)
                self._ensemble_context = search_context.filter(uuid=self._case_uuid, iteration=self._iteration_name)
            except Exception as exc:
                raise NoDataError(
                    f"Unable to get ensemble context for {self._case_uuid=}, {self._iteration_name=}", Service.SUMO
                ) from exc

        return self._ensemble_context

    async def load_aggregated_arrow_table_single_column_from_sumo(
        self,
        table_column_name: str,
        table_name: str | None = None,
        table_content_name: str | None = None,
        table_tagname: str | None = None,
    ) -> pa.Table:
        timer = PerfMetrics()

        ensemble_context = await self.get_ensemble_context()
        table_context = ensemble_context.filter(
            cls="table",
            # tagname=table_tagname,
            content=table_content_name,
            column=table_column_name,
            name=table_name,
        )
        timer.record_lap("get_context")
        agg = await table_context.aggregation_async(column=table_column_name, operation="collection")
        timer.record_lap("aggregation_async")
        LOGGER.debug(f"load_aggregated_arrow_table_single_column_from_sumo {timer.to_string()}, {table_column_name=}")

        return await agg.to_arrow_async()

    async def load_aggregated_arrow_table_multiple_columns_from_sumo(
        self,
        table_column_names: list[str],
        table_name: str | None = None,
        table_content_name: str | None = None,
        table_tagname: str | None = None,
    ) -> pa.Table:
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(
                    self.load_aggregated_arrow_table_single_column_from_sumo(
                        table_content_name=table_content_name,
                        table_tagname=table_tagname,
                        table_name=table_name,
                        table_column_name=column_name,
                    )
                )
                for column_name in table_column_names
            ]
        table_arr = [task.result() for task in tasks]

        table = None
        for column_table, column_name in zip(table_arr, table_column_names):
            if table is None:
                table = column_table
            else:
                table = table.append_column(column_name, column_table[column_name])
        return table

    async def load_single_realization_arrow_table(
        self, table_content_name: str, table_name: str, realization_no: int, table_column_names: list[str] | None = None
    ) -> pa.Table:
        timer = PerfMetrics()

        ensemble_context = await self.get_ensemble_context()
        timer.record_lap("get_ensemble_context")
        table_context = ensemble_context.tables.filter(
            name=table_name,
            realization=realization_no,
        )
        no_of_tables = await table_context.length_async()
        if no_of_tables == 0:
            raise NoDataError(
                f"No tables found in {self._case_uuid=}, {self._iteration_name=}, {table_content_name=}, {table_name=}",
                Service.SUMO,
            )
        if no_of_tables > 1:
            raise MultipleDataMatchesError(
                f"Multiple tables found in {self._case_uuid=}, {self._iteration_name=}, {table_content_name=}, {table_name=}",
                Service.SUMO,
            )
        sumo_table = await table_context.getitem_async(0)
        timer.record_lap("getitem_async")
        table = await sumo_table.to_arrow_async()
        timer.record_lap("to_arrow_async")

        LOGGER.debug(
            f"{timer.to_string()}, {self._case_uuid=}, {self._iteration_name=}, {table_content_name=}, {table_name=}"
        )
        if table_column_names is not None:
            return table.select(table_column_names)
        return table

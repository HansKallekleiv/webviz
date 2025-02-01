from typing import TypeVar, Type
import logging

import pyarrow as pa
import pyarrow.feather as pf
import pyarrow.parquet as pq
from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects._search_context import SearchContext
from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from primary.services.service_exceptions import Service, NoDataError, MultipleDataMatchesError
from ._helpers import create_sumo_client


T = TypeVar("T", bound="SumoEnsembleAccess")
LOGGER = logging.getLogger(__name__)


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

    async def get_ensemble_context(self) -> SearchContext:
        """
        Get the ensemble context, creating it if necessary.

        Returns:
            SearchContext: The context for the current ensemble

        Raises:
            RuntimeError: If unable to create or retrieve ensemble context
        """
        if not self._ensemble_context:
            try:
                search_context = SearchContext(sumo=self._sumo_client)
                self._ensemble_context = await search_context.get_case_by_uuid_async(self._case_uuid)
            except Exception as exc:
                raise NoDataError(
                    f"Unable to get ensemble context for {self._case_uuid=}, {self._iteration_name=}", Service.SUMO
                ) from exc

        return self._ensemble_context.filter(iteration=self._iteration_name)

    async def load_aggregated_arrow_table_from_sumo(
        self, table_content_name: str, table_name: str, table_column_name: str
    ) -> pa.Table:
        timer = PerfMetrics()

        ensemble_context = await self.get_ensemble_context()
        timer.record_lap("get_ensemble_context")
        table_context = ensemble_context.filter(
            cls="table",
            tagname="summary",
            column=table_column_name,
        )
        agg = await table_context.aggregation_async(column=table_column_name, operation="collection")
        timer.record_lap("aggregation_async")
        LOGGER.debug(
            f"{timer.to_string()}, {self._case_uuid=}, {self._iteration_name=}, {table_content_name=}, {table_name=}, {table_column_name=}"
        )

        return await agg.to_arrow_async()

    async def load_single_realization_arrow_table(
        self, table_content_name: str, table_name: str, table_column_names: list[str], realization_no: int
    ) -> pa.Table:
        timer = PerfMetrics()

        ensemble_context = await self.get_ensemble_context()
        timer.record_lap("get_ensemble_context")
        table_context = ensemble_context.filter(
            cls="table",
            tagname=table_name,
            stage="realization",
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
        table: pa.Table = await table_context.to_arrow_async()

        timer.record_lap("to_arrow_async")

        LOGGER.debug(
            f"{timer.to_string()}, {self._case_uuid=}, {self._iteration_name=}, {table_content_name=}, {table_name=}"
        )

        return table.select(table_column_names)

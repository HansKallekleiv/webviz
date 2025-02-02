import asyncio
import pyarrow as pa
from fmu.sumo.explorer.objects import Case


from primary.services.service_exceptions import InvalidDataError, MultipleDataMatchesError, Service, NoDataError
from primary.services.sumo_access.sumo_ensemble_access import SumoEnsembleAccess

from ._helpers import create_sumo_client, create_sumo_case_async


class WellCompletionsAccess(SumoEnsembleAccess):
    """
    Class for accessing and retrieving well completions data
    """

    TAGNAME = "wellcompletiondata"

    async def get_well_completions_single_realization_table_async(self, realization: int) -> pa.Table | None:
        """Get well completions table for single realization"""
        ensemble_context = await self.get_ensemble_context()
        well_completion_table_context = ensemble_context.tables.filter(
            tagname=WellCompletionsAccess.TAGNAME, realization=realization, iteration=self._iteration_name
        )
        table_count = await well_completion_table_context.length_async()
        if table_count == 0:
            raise NoDataError(
                f"No well completions data found for {realization=}, {self._case_uuid=}, {self._iteration_name=}",
                service=Service.SUMO,
            )

        if table_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple well completions tables found for {realization=}, {self._case_uuid=}, {self._iteration_name=}",
                service=Service.SUMO,
            )

        well_completions_table = await well_completion_table_context[0].to_arrow_async()
        return well_completions_table

    async def get_well_completions_table_async(self) -> pa.Table:
        """Get assembled well completions table for multiple realizations, i.e. assemble from collection into single table

        Expected table columns: ["WELL", "DATE", "ZONE", "REAL", "OP/SH", "KH"]
        """

        # With multiple realizations, expect one table with aggregated OP/SH and one with aggregate KH data
        ensemble_context = await self.get_ensemble_context()
        well_completion_table_context = ensemble_context.tables.filter(
            cls="table",
            tagname=WellCompletionsAccess.TAGNAME,
        )
        columns = await well_completion_table_context.columns_async

        expected_columns = ["WELL", "DATE", "ZONE", "REAL", "OP/SH", "KH"]
        if not set(expected_columns) == set(columns):
            raise InvalidDataError(
                f"Expected columns: {expected_columns}, got: {columns}",
                service=Service.SUMO,
            )

        table = await self.load_aggregated_arrow_table_multiple_columns_from_sumo(
            table_tagname="wellcompletiondata",
            table_name=WellCompletionsAccess.TAGNAME,
            table_column_names=["OP/SH", "KH"],
        )
        return table

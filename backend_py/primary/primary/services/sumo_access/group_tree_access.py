import logging
from typing import Optional

import pandas as pd


from webviz_pkg.core_utils.perf_timer import PerfTimer


from primary.services.sumo_access.sumo_ensemble_access import SumoEnsembleAccess
from primary.services.service_exceptions import (
    Service,
    MultipleDataMatchesError,
)

LOGGER = logging.getLogger(__name__)


class GroupTreeAccess(SumoEnsembleAccess):
    """
    Class for accessing and retrieving group tree data
    """

    TAGNAME = "gruptree"

    async def get_group_tree_table_for_realization(self, realization: int) -> Optional[pd.DataFrame]:
        """Get well group tree data for case and iteration"""
        timer = PerfTimer()
        ensemble_context = await self.get_ensemble_context()
        # With single realization, filter on realization

        table_context = ensemble_context.filter(cls="table", tagname=GroupTreeAccess.TAGNAME, realization=realization)
        table_count = await table_context.length_async()
        if table_count == 0:
            return None
        if table_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple tables found for {realization=} {self._case_uuid},{self._iteration_name}, {GroupTreeAccess.TAGNAME}",
                service=Service.SUMO,
            )

        group_tree_df = await table_context[0].to_pandas_async()

        _validate_group_tree_df(group_tree_df)

        LOGGER.debug(f"Loaded gruptree table from Sumo in: {timer.elapsed_ms()}ms")
        return group_tree_df

        # # If no realization is specified, get all tables and merge them
        # table_collection = ensemble_context.filter(
        #     tagname=GroupTreeAccess.TAGNAME, aggregation="collection", iteration=self._iteration_name
        # )

        # df0 = table_collection[0].to_pandas()
        # df1 = table_collection[1].to_pandas()
        # df2 = table_collection[2].to_pandas()

        # group_tree_df = pd.merge(df0, df1, left_index=True, right_index=True)
        # group_tree_df = pd.merge(group_tree_df, df2, left_index=True, right_index=True)

        # _validate_group_tree_df(group_tree_df)

        # LOGGER.debug(f"Loaded gruptree table from Sumo in: {timer.elapsed_ms()}ms")
        # return group_tree_df


def _validate_group_tree_df(df: pd.DataFrame) -> None:
    expected_columns = {"DATE", "CHILD", "KEYWORD", "PARENT"}

    if not expected_columns.issubset(df.columns):
        raise ValueError(f"Expected columns: {expected_columns} - got: {df.columns}")

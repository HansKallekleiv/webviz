import logging
from typing import List, Optional, Sequence


import pyarrow as pa
import polars as pl
import pyarrow.compute as pc


from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary.services.service_exceptions import (
    Service,
    NoDataError,
    MultipleDataMatchesError,
)

from primary.services.sumo_access.sumo_ensemble_access import SumoEnsembleAccess
from .rft_types import RftTableDefinition, RftWellInfo, RftRealizationData

LOGGER = logging.getLogger(__name__)


ALLOWED_RFT_RESPONSE_NAMES = ["PRESSURE", "SGAS", "SWAT", "SOIL"]


class RftAccess(SumoEnsembleAccess):
    async def get_rft_info(self) -> RftTableDefinition:
        """Get a collection of rft tables for a case and iteration"""
        timer = PerfMetrics()

        ensemble_context = await self.get_ensemble_context()
        table_context = ensemble_context.filter(cls="table", tagname="rft")
        timer.record_lap("get_ensemble_context")

        table_names = await table_context.names_async
        timer.record_lap("get_table_names")

        if len(table_names) == 0:
            raise NoDataError(
                f"No rft tables found in case={self._case_uuid}, iteration={self._iteration_name}", Service.SUMO
            )
        if len(table_names) > 1:
            raise MultipleDataMatchesError(
                f"Multiple rft tables found in case={self._case_uuid}, iteration={self._iteration_name}: {table_names=}",
                Service.SUMO,
            )

        columns = await table_context.columns_async
        available_response_names = [col for col in columns if col in ALLOWED_RFT_RESPONSE_NAMES]

        table = await self.load_aggregated_arrow_table_multiple_columns_from_sumo(
            table_content_name="rft", table_name=table_names[0], table_column_names=available_response_names
        )
        timer.record_lap("load_aggregated_arrow_table")

        rft_well_infos: list[RftWellInfo] = []
        well_names = table["WELL"].unique().tolist()

        for well_name in well_names:
            well_table = table.filter(pc.equal(table["WELL"], well_name))
            timestamps_utc_ms = sorted(list(set(well_table["DATE"].to_numpy().astype(int).tolist())))

            rft_well_infos.append(RftWellInfo(well_name=well_name, timestamps_utc_ms=timestamps_utc_ms))

        timer.record_lap("process_well_infos")
        LOGGER.debug(f"{timer.to_string()}, {self._case_uuid=}, {self._iteration_name=}")
        return RftTableDefinition(response_names=available_response_names, well_infos=rft_well_infos)

    async def get_rft_well_realization_data(
        self,
        well_name: str,
        response_name: str,
        timestamps_utc_ms: Optional[Sequence[int]],
        realizations: Optional[Sequence[int]],
    ) -> List[RftRealizationData]:

        timer = PerfMetrics()
        column_names = [response_name, "DEPTH"]

        table = await self.load_aggregated_arrow_table_multiple_columns_from_sumo(
            table_content_name="rft", table_name="rft", table_column_names=column_names
        )
        timer.record_lap("load_aggregated_arrow_table")

        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)

        mask = pc.equal(table["WELL"], well_name)
        table = table.filter(mask)
        if timestamps_utc_ms is not None:
            mask = pc.is_in(table["DATE"], value_set=pa.array(timestamps_utc_ms))
            table = table.filter(mask)

        timer.record_lap("filter_table")
        polars_table: pl.DataFrame = pl.from_arrow(table)  # type: ignore

        polars_table = (
            polars_table.group_by(["REAL", "DATE"])
            .agg([pl.col("DEPTH").alias("depth_arr"), pl.col(response_name).alias("value_arr")])
            .with_columns(
                [
                    pl.lit(well_name).alias("well_name"),
                    (pl.col("DATE").cast(pl.Datetime).dt.timestamp() * 1000).alias("timestamp_utc_ms"),
                    pl.col("REAL").alias("realization"),
                ]
            )
            .select(["well_name", "realization", "timestamp_utc_ms", "depth_arr", "value_arr"])
        )
        timer.record_lap("process_table_in_polars")
        ret_arr_rows = polars_table.iter_rows(named=True)
        ret_arr = [RftRealizationData(**row) for row in ret_arr_rows]
        LOGGER.debug(
            f"{timer.to_string()}, {self._case_uuid=}, {self._iteration_name=}, {well_name=}, {response_name=}"
        )
        return ret_arr

import logging

import polars as pl
import pyarrow as pa
from fmu.datamodels.standard_results.enums import StandardResultName
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_core_utils.perf_metrics import PerfMetrics

from webviz_services.inplace_volumes_table_assembler._utils.simulator_volumes_df_utils import (
    filter_to_earliest_date,
)
from webviz_services.service_exceptions import InvalidDataError, Service

from ._arrow_table_loader import ArrowTableLoader
from .inplace_volumes_table_access import IGNORED_INDEX_COLUMN_VALUES
from .inplace_volumes_table_types import VolumeColumnsAndIndexUniqueValues
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)

_SIMULATOR_INDEX_COLUMNS = ("FIPNUM", "DATE", "FLUID")
_SIMULATOR_SELECTOR_COLUMNS = ("FIPNUM", "DATE", "FLUID", "REAL")


class SimulatorInplaceVolumesTableAccess:
    """
    Class for accessing and retrieving simulator_inplace_volumes table data from Sumo.
    """

    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )
        self._table_names: list[str] | None = None

    @classmethod
    def from_ensemble_name(
        cls, access_token: str, case_uuid: str, ensemble_name: str
    ) -> "SimulatorInplaceVolumesTableAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_table_names_async(self) -> list[str]:
        """Get list of simulator inplace volumes table names for the given case and ensemble."""
        if self._table_names is not None:
            return self._table_names

        table_context = self._ensemble_context.tables.filter(
            standard_result=StandardResultName.simulator_inplace_volumes
        )
        self._table_names = await table_context.names_async
        return self._table_names

    async def get_volume_columns_and_index_unique_values_async(
        self, table_name: str
    ) -> VolumeColumnsAndIndexUniqueValues:
        """
        Get volumetric column names and unique values for index columns (FLUID, FIPNUM) at the
        earliest DATE for the first realization of a simulator inplace volumes table.
        """
        realization = await self._get_first_realization_with_table_async(table_name)
        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_standard_result(StandardResultName.simulator_inplace_volumes)
        table_loader.require_table_name(table_name)

        pa_table = await table_loader.get_single_realization_async(realization)
        df = pl.DataFrame(pa_table)

        # Single-realization inspection: filter to earliest DATE and drop DATE
        earliest_df = filter_to_earliest_date(df, table_name).get_value_ignore_warnings()

        index_columns = [col for col in _SIMULATOR_INDEX_COLUMNS if col != "DATE" and col in earliest_df.columns]
        volumetric_columns = [col for col in earliest_df.columns if col not in _SIMULATOR_SELECTOR_COLUMNS]

        index_column_unique_values_map: dict[str, list[str]] = {}
        for col in index_columns:
            series = earliest_df[col]
            if col == "FIPNUM":
                series = series.cast(pl.Int64, strict=False)
            unique_values = series.unique(maintain_order=True).to_list()
            valid_unique_values = [str(val) for val in unique_values if val not in IGNORED_INDEX_COLUMN_VALUES]
            index_column_unique_values_map[col] = valid_unique_values

        return VolumeColumnsAndIndexUniqueValues(
            volume_columns=volumetric_columns,
            index_unique_values_map=index_column_unique_values_map,
        )

    async def get_aggregated_table_async(
        self, table_name: str, volume_columns: set[str] | None = None
    ) -> pa.Table:
        """
        Get aggregated simulator inplace volumes table for requested volumetric columns.

        Only volumetric columns are passed in requested_columns; Sumo returns table_index columns
        (FIPNUM, DATE, FLUID) and REAL automatically.
        """
        perf_metrics = PerfMetrics()

        table_context = self._ensemble_context.tables.filter(
            name=table_name,
            standard_result=StandardResultName.simulator_inplace_volumes,
            column=volume_columns if volume_columns is None else list(volume_columns),
        )

        perf_metrics.reset_lap_timer()
        available_column_names = await table_context.columns_async
        perf_metrics.record_lap("get-column-names")

        available_response_names = [col for col in available_column_names if col not in _SIMULATOR_SELECTOR_COLUMNS]
        if volume_columns is not None and not volume_columns.issubset(set(available_response_names)):
            raise InvalidDataError(
                f"Missing requested columns: {volume_columns}, in the simulator inplace volumes table "
                f"{self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        requested_columns = available_response_names if volume_columns is None else list(volume_columns)

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_standard_result(StandardResultName.simulator_inplace_volumes)
        table_loader.require_table_name(table_name)
        pa_table = await table_loader.get_aggregated_multiple_columns_async(requested_columns)
        perf_metrics.record_lap("load-table")

        LOGGER.debug(
            f"SimulatorInplaceVolumesTableAccess.get_aggregated_table_async took: {perf_metrics.to_string()}, "
            f"{table_name=}, {volume_columns=}"
        )

        return pa_table

    async def _get_first_realization_with_table_async(self, table_name: str) -> int:
        table_context = self._ensemble_context.tables.filter(
            name=table_name,
            standard_result=StandardResultName.simulator_inplace_volumes,
            realization=True,
            aggregation=False,
        )
        realizations = await table_context.realizationids_async
        if len(realizations) == 0:
            raise InvalidDataError(
                f"No realizations with simulator inplace volumes table {table_name} found in the ensemble "
                f"{self._case_uuid}, {self._ensemble_name}",
                Service.SUMO,
            )
        return min(realizations)

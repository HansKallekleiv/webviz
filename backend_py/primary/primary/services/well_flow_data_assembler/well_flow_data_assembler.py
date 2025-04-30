from enum import StrEnum
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import asyncio

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from primary.services.sumo_access.summary_access import SummaryAccess
from primary.services.sumo_access.surface_access import SurfaceAccess
from primary.services.smda_access import SmdaAccess, WellboreHeader

import polars as pl

LOGGER = logging.getLogger(__name__)


@dataclass
class WellFlowData:
    oil_production_volume: float | None
    gas_production_volume: float | None
    water_production_volume: float | None
    water_injection_volume: float | None
    gas_injection_volume: float | None
    co2_injection_volume: float | None
    well_uwi: str | None
    eclipse_well_name: str


class FlowVector(StrEnum):
    OIL_PRODUCTION = "oil_production"
    GAS_PRODUCTION = "gas_production"
    WATER_PRODUCTION = "water_production"
    WATER_INJECTION = "water_injection"
    GAS_INJECTION = "gas_injection"
    CO2_INJECTION = "co2_injection"


@dataclass
class WellFlowDataInfo:
    flow_vector_arr: List[FlowVector]
    well_uwi: str | None
    eclipse_well_name: str


flow_vectors_eclipse_mapping = {
    "WOPTH": FlowVector.OIL_PRODUCTION,
    "WGPTH": FlowVector.GAS_PRODUCTION,
    "WWPTH": FlowVector.WATER_PRODUCTION,
    ""
}


@dataclass
class FlowDataInfo:
    start_timestamp_utc_ms: int
    end_timestamp_utc_ms: int
    flow_vectors: List[FlowVector]


@dataclass
class FlowDataInWell:
    well_uwi: str | None
    eclipse_well_name: str
    oil_production_volume: float | None
    gas_production_volume: float | None
    water_production_volume: float | None
    water_injection_volume: float | None
    gas_injection_volume: float | None
    co2_injection_volume: float | None


@dataclass
class FlowDataInterval:
    start_timestamp_utc_ms: str
    end_timestamp_utc_ms: str
    well_flow_data_arr: List[FlowDataInWell]


class WellFlowDataAssembler:
    """ """

    def __init__(
        self,
        field_identifier: str,
        summary_access: SummaryAccess,
        surface_access: SurfaceAccess,
        smda_access: SmdaAccess,
    ):
        self._field_identifier = field_identifier
        self._summary_access = summary_access
        self._surface_access = surface_access
        self._smda_access = smda_access
        self._smda_uwis: Optional[List[str]] = None

    async def _get_smda_well_uwis_async(self) -> List[str]:
        if self._smda_uwis is None:
            wellbore_headers = await self._smda_access.get_wellbore_headers_async(
                field_identifier=self._field_identifier
            )
            self._smda_uwis = [header.unique_wellbore_identifier for header in wellbore_headers]
        return self._smda_uwis

    async def get_flow_info_async(self) -> FlowDataInfo:
        """Get metadata for all flow data, including start and end dates, and flow vectors"""

        available_summary_column_names = await self._summary_access.get_all_available_column_names_async()
        available_flow_vectors = []
        for eclkey, flowvec in flow_vectors_eclipse_mapping.items():
            matching_columns = [col for col in available_summary_column_names if eclkey in col]
            if len(matching_columns) > 0:
                available_flow_vectors.append(flowvec)

        smry_realization_data_arrow = await self._summary_access.get_single_real_full_table_async(realization=1)
        smry_data_pl = pl.from_arrow(smry_realization_data_arrow)

        start_timestamp_utc_ms = smry_data_pl["DATE"].cast(pl.Int64).min()
        #
        end_timestamp_utc_ms = smry_data_pl["DATE"].cast(pl.Int64).max()
        # Print unique values of the DATE column
        unique_dates = smry_data_pl["DATE"].unique()
        print(f"Unique dates: {unique_dates}")
        flow_data_info = FlowDataInfo(
            start_timestamp_utc_ms=start_timestamp_utc_ms,
            end_timestamp_utc_ms=end_timestamp_utc_ms,
            flow_vectors=available_flow_vectors,
        )

        return flow_data_info

    async def get_well_flow_data_info_async(
        self,
    ) -> List[FlowDataInterval]:
        """Get metadata for all flow data, including start and end dates, and flow vectors"""

        async with asyncio.TaskGroup() as tg:
            smry_realization_data_task = tg.create_task(
                self._summary_access.get_single_real_full_table_async(realization=1)
            )
            smda_wellbore_headers_task = tg.create_task(
                self._smda_access.get_wellbore_headers_async(field_identifier=self._field_identifier)
            )
            observed_surfaces_time_intervals_task = tg.create_task(
                self._surface_access.get_time_intervals_for_observed_surfaces_async()
            )
        smry_realization_data_arrow = smry_realization_data_task.result()
        smda_wellbore_headers = smda_wellbore_headers_task.result()
        observed_surfaces_time_intervals = observed_surfaces_time_intervals_task.result()

        smry_data_pl = pl.DataFrame(smry_realization_data_arrow)

        matching_columns = [
            col for col in smry_data_pl.columns if col.split(":")[0] in flow_vectors_eclipse_mapping.keys()
        ]
        columns_to_keep = ["DATE"] + matching_columns
        smry_data_pl_filtered_cols = smry_data_pl.select(columns_to_keep)

        interval_data_results = []
        for interval in observed_surfaces_time_intervals:

            start_time = pl.lit(datetime.strptime(interval.t0_isostr, "%Y-%m-%dT%H:%M:%S.%fZ")).cast(pl.Datetime)
            end_time = pl.lit(datetime.strptime(interval.t1_isostr, "%Y-%m-%dT%H:%M:%S.%fZ")).cast(pl.Datetime)

            tmp_data = smry_data_pl_filtered_cols.filter(
                (pl.col("DATE").is_between(start_time, end_time, closed="both"))
            )

            if tmp_data.height == 0:
                print(f"Warning: No data found for interval {interval.t0_isostr} to {interval.t1_isostr}")

                interval_data_results.append(
                    FlowDataInterval(
                        start_timestamp_utc_ms=interval.t0_isostr,
                        end_timestamp_utc_ms=interval.t1_isostr,
                        well_flow_data_arr=[],
                    )
                )
                continue

            # Create expressions for min and max for each column
            min_max_exprs = []
            for col in matching_columns:
                min_max_exprs.append(pl.min(col).alias(f"{col}_min"))
                min_max_exprs.append(pl.max(col).alias(f"{col}_max"))

            aggregations = tmp_data.select(min_max_exprs)
            # Aggregations DataFrame should have exactly one row
            if aggregations.height != 1:

                print(f"Warning: Aggregation did not return a single row for interval {interval.t0_isostr}")
                continue

            agg_results = aggregations.row(0, named=True)  # Get results as a dictionary

            # Create a dict containing volumes for each well and fill with total volume
            # As we are working with total vectors, we can just take the difference between max and min
            well_flow_data_dict = {}
            for col in matching_columns:
                vector, well_name = col.split(":", 1)

                # Get the mapped output key (e.g., "oil_production_volume")
                output_key = flow_vectors_eclipse_mapping.get(vector)
                if not output_key:
                    print(f"Warning: Vector '{vector}' not found in mapping for column '{col}'. Skipping.")
                    continue

                min_val = agg_results.get(f"{col}_min")
                max_val = agg_results.get(f"{col}_max")

                # Check if min/max returned None 
                if min_val is None or max_val is None:
                    volume_diff = 0.0 

                    print(f"Warning: Null values encountered for column '{col}' in interval {interval.t0_isostr}")
                else:
                    volume_diff = max_val - min_val

                # Initialize well dict if not present
                if well_name not in well_flow_data_dict:
                    well_flow_data_dict[well_name] = {
                        "oil_production_volume": 0.0,
                        "gas_production_volume": 0.0,
                        "water_production_volume": 0.0,
                 
                    }

                well_flow_data_dict[well_name][flow_vectors_eclipse_mapping[vector].value] = volume_diff
                # Attempt to map Eclipse names in to SMDA well UWI and only keep those that are found
            # Alternative we could do this on the frontend as we already have all the uwis there

            smda_uwi_arr = [header.unique_wellbore_identifier for header in smda_wellbore_headers]
            flow_data: List[FlowDataInWell] = []
            for well_name, flow_data_dict in well_flow_data_dict.items():
                well_uwi = _eclipse_well_name_to_smda_uwi(well_name, smda_uwi_arr)
                if well_uwi is None:
                    # LOGGER.warning(f"Could not find a unique match for well name {well_name} in smda uwis ")
                    continue
                flow_data.append(
                    FlowDataInWell(
                        oil_production_volume=flow_data_dict[flow_vectors_eclipse_mapping["WOPTH"].value],
                        gas_production_volume=flow_data_dict[flow_vectors_eclipse_mapping["WGPTH"].value],
                        water_production_volume=flow_data_dict[flow_vectors_eclipse_mapping["WWPTH"].value],
                        water_injection_volume=0,
                        gas_injection_volume=0,
                        co2_injection_volume=0,
                        well_uwi=well_uwi,
                        eclipse_well_name=well_name,
                    )
                )
            interval_data_results.append(
                FlowDataInterval(
                    start_timestamp_utc_ms=interval.t0_isostr,
                    end_timestamp_utc_ms=interval.t1_isostr,
                    well_flow_data_arr=flow_data,
                )
            )

        return interval_data_results

    async def get_well_flow_data_in_interval_async(
        self,
        realization: int,
        minimum_volume_limit: float,
        start_timestamp_utc_ms: int,
        end_timestamp_utc_ms: int,
    ) -> List[WellFlowData]:
        perf_metrics = PerfMetrics()

        # Fetch summary table for given realization and wellbore headers from SMDA for well UWI mapping
        # Good candidate for caching, or we can do this on the frontend
        async with asyncio.TaskGroup() as tg:
            smry_realization_data_task = tg.create_task(
                self._summary_access.get_single_real_full_table_async(realization=1)
            )
            smda_wellbore_headers_task = tg.create_task(
                self._smda_access.get_wellbore_headers_async(field_identifier=self._field_identifier)
            )
        smry_realization_data_arrow = smry_realization_data_task.result()

        smda_wellbore_headers = smda_wellbore_headers_task.result()

        perf_metrics.record_lap("fetch data")

        smry_data_pl = pl.DataFrame(smry_realization_data_arrow)
        perf_metrics.record_lap("convert to polars")

        smry_data_pl = smry_data_pl.filter(
            (pl.col("DATE").cast(pl.Int64) >= start_timestamp_utc_ms)
            & (pl.col("DATE").cast(pl.Int64) <= end_timestamp_utc_ms)
        )

        # Relevant vectors are on the form "vector:well_name"
        # e.g. "WOPTH:6472_11-F-23_AH_T2"
        available_summary_column_names = smry_data_pl.columns
        matching_columns = [
            col for col in available_summary_column_names if col.split(":")[0] in flow_vectors_eclipse_mapping.keys()
        ]
        columns_to_keep = ["DATE"] + matching_columns
        smry_data_pl_filtered_cols = smry_data_pl.select(columns_to_keep)
        # Create a dict containing volumes for each well and fill with total volume
        # As we are working with total vectors, we can just take the difference between max and min
        well_flow_data_dict = {}
        for col in matching_columns:
            well_name = col.split(":")[1]
            vector = col.split(":")[0]
            if well_name not in well_flow_data_dict:
                well_flow_data_dict[well_name] = {
                    "oil_production_volume": 0,
                    "gas_production_volume": 0,
                    "water_production_volume": 0,
                }
            max_value = smry_data_pl_filtered_cols.select(pl.col(col).max()).row(0)[0]
            min_value = smry_data_pl_filtered_cols.select(pl.col(col).min()).row(0)[0]
            well_flow_data_dict[well_name][flow_vectors_eclipse_mapping[vector].value] = max_value - min_value
        print(f"Well flow data dict: {well_flow_data_dict}")
        # Attempt to map Eclipse names in to SMDA well UWI and only keep those that are found
        # Alternative we could do this on the frontend as we already have all the uwis there
        smda_uwi_arr = [header.unique_wellbore_identifier for header in smda_wellbore_headers]
        flow_data: List[WellFlowData] = []
        for well_name, flow_data_dict in well_flow_data_dict.items():
            well_uwi = _eclipse_well_name_to_smda_uwi(well_name, smda_uwi_arr)
            if well_uwi is None:
                # LOGGER.warning(f"Could not find a unique match for well name {well_name} in smda uwis ")
                continue
            flow_data.append(
                WellFlowData(
                    oil_production_volume=flow_data_dict[flow_vectors_eclipse_mapping["WOPTH"].value],
                    gas_production_volume=flow_data_dict[flow_vectors_eclipse_mapping["WGPTH"].value],
                    water_production_volume=flow_data_dict[flow_vectors_eclipse_mapping["WWPTH"].value],
                    water_injection_volume=0,
                    gas_injection_volume=0,
                    co2_injection_volume=0,
                    well_uwi=well_uwi,
                    eclipse_well_name=well_name,
                )
            )

        perf_metrics.record_lap("Process")

        LOGGER.debug(
            f"Got well flow data in interval for realization {realization} in: {perf_metrics.to_string()} [{len(flow_data)} entries]"
        )
        return flow_data


def _eclipse_well_name_to_smda_uwi(eclipse_well_name: str, smda_uwi_arr: List[str]) -> str | None:
    well_name = eclipse_well_name.replace("_", "").replace("-", "")
    # Snorre hack
    if well_name.endswith("W") or well_name.endswith("P") or well_name.endswith("G"):
        well_name = well_name[:-1]
    if well_name.endswith("WG") or well_name.endswith("PG"):
        well_name = well_name[:-2]

    well_short_names = [get_short_wellname(uwi) for uwi in smda_uwi_arr]
    well_uwi_arr = []
    for i, well_short_name in enumerate(well_short_names):
        if well_short_name == well_name:
            well_uwi_arr.append(smda_uwi_arr[i])

    if len(well_uwi_arr) == 1:
        return well_uwi_arr[0]
    else:
        # LOGGER.warning(f"Could not find a unique match for well name {well_name} in smda uwis ")
        return None


def get_short_wellname(wellname):
    """Well name on a short name form where blockname and spaces are removed.

    This should cope with both North Sea style and Haltenbanken style.
    E.g.: '31/2-G-5 AH' -> 'G-5AH', '6472_11-F-23_AH_T2' -> 'F-23AHT2'
    Stolen from Xtgeo
    """
    newname = []
    first1 = False
    first2 = False
    for letter in wellname:
        if first1 and first2:
            newname.append(letter)
            continue
        if letter in ("_", "/"):
            first1 = True
            continue
        if first1 and letter == "-":
            first2 = True
            continue

    xname = "".join(newname)
    xname = xname.replace("_", "")
    return xname.replace(" ", "").replace("-", "")

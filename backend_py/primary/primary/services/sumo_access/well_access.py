import logging

from typing import List, Final

import asyncio
import polars as pl
from fmu.sumo.explorer.objects import Case


from primary.services.service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
    MultipleDataMatchesError,
    InvalidParameterError,
)

from .well_types import WellZonesInfo, WellZonePick
from ._helpers import create_sumo_client, create_sumo_case_async


LOGGER = logging.getLogger(__name__)

REQUIRED_TABLE_COLUMNS : Final = ['BASE_MD', 'BASE_TVD', 'REAL', 'TOP_MD', 'TOP_TVD', 'WELL', 'X_UTME', 'Y_UTMN', 'ZONE', 'ZONE_CODE']
class WellAccess:
    def __init__(self, case: Case, case_uuid: str, iteration_name: str):
        self._case: Case = case
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(
        cls, access_token: str, case_uuid: str, iteration_name: str
    ) -> "WellAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return WellAccess(case=case, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_well_zones_info(self) -> List[WellZonesInfo]:
        vol_table_collection = self._case.tables.filter(
            aggregation="collection",
            name="formations",
            iteration=self._iteration_name,
        )
        table_names = await vol_table_collection.names_async
        if len(table_names) == 0:
            raise NoDataError(f"No well zone tables found for {self._case_uuid=}, {self._iteration_name=} ", Service.SUMO)
        if len(table_names) > 1:
            raise MultipleDataMatchesError(
                f"Multiple well zone tables found for {self._case_uuid=}, {self._iteration_name=} ", Service.SUMO
            )
        
        table_columns = await vol_table_collection.columns_async
        for col in REQUIRED_TABLE_COLUMNS:
            if col not in table_columns:
                raise InvalidDataError(
                    f"Missing column {col} in well zone table for {self._case_uuid=}, {self._iteration_name=}",
                    Service.SUMO,
                )
        vol_table_collection = self._case.tables.filter(
            aggregation="collection",
            name="formations",
            column=["ZONE_CODE"],
            iteration=self._iteration_name,
        )
        arrow_table = await vol_table_collection[0].to_arrow_async()
        pl_table = pl.DataFrame(arrow_table)
        zone_info = (
            pl_table
            .select(["ZONE", "ZONE_CODE"])
            .unique()
            .sort("ZONE_CODE")
        )

        well_zones_info = WellZonesInfo(
            well_names=sorted(pl_table["WELL"].unique().to_list()), 
            zone_names=zone_info["ZONE"].to_list(),
            zone_codes=zone_info["ZONE_CODE"].to_list(),
        )
        vol_table_collection = self._case.tables.filter(
            aggregation="collection",
            name="formations",
            column=["X_UTME"],
            iteration=self._iteration_name,
        )
        arrow_table = await vol_table_collection[0].to_arrow_async()
        pl_table = pl.DataFrame(arrow_table)
        print(pl_table["X_UTME"].to_list())
        print(pl_table["X_UTME"].unique().to_list())
        return well_zones_info
        
    async def get_well_zone_realization_pick(self, zone_name:str, realization_num:int,well_names:List[str]|None=None):
        pass
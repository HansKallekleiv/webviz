import logging
from dataclasses import dataclass
from typing import List
import asyncio

import pandas as pd

from fmu.sumo.explorer.explorer import SearchContext, SumoClient


from primary.services.service_exceptions import MultipleDataMatchesError, NoDataError, Service


from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


@dataclass
class SimulationWell:
    well_name: str
    realization: int
    i_arr: list[int]
    j_arr: list[int]
    k_arr: list[int]
    x_arr: list[float]
    y_arr: list[float]
    z_arr: list[float]
    open_shut: list[str]


class SimulationWellAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "SimulationWellAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_well_geometries(self, realization_num: int) -> List[SimulationWell]:

        real_context = self._ensemble_context.filter(realization=realization_num)
        # Get compdat
        compdat_context = real_context.filter(tagname="compdat")
        no_of_compdat_objs = await compdat_context.length_async()
        if no_of_compdat_objs == 0:
            raise NoDataError("No compdat objects found for the given case and iteration", Service.SUMO)
        if no_of_compdat_objs > 1:
            raise MultipleDataMatchesError(
                "Multiple compdat objects found for the given case and iteration", Service.SUMO
            )
        compdat_obj = await compdat_context.getitem_async(0)

        # Expect the simulation run "dataname" to be the name of the compdat object
        dataname = compdat_obj.name

        # Get the simulation grid geometry. Expect the tagname to be the same as the compdat object name
        grid_geometry_context = real_context.filter(cls="cpgrid", tagname=dataname)
        no_of_grid_geometry_objs = await grid_geometry_context.length_async()
        if no_of_grid_geometry_objs == 0:
            raise NoDataError("No grid geometry objects found for the given case and iteration", Service.SUMO)
        if no_of_grid_geometry_objs > 1:
            raise MultipleDataMatchesError(
                "Multiple grid geometry objects found for the given case and iteration", Service.SUMO
            )
        grid_obj = await grid_geometry_context.getitem_async(0)

        async with asyncio.TaskGroup() as tg:
            compdat_df_task = tg.create_task(compdat_obj.to_pandas_async())
            xtg_grid_task = tg.create_task(grid_obj.to_cpgrid_async())

        compdat_df = compdat_df_task.result()
        xtg_grid = xtg_grid_task.result()

        grid_df = xtg_grid.get_dataframe(activeonly=False)
        # Rename and merge

        grid_df_renamed = grid_df.rename(
            columns={
                "IX": "I",
                "JY": "J",
                "KZ": "K1",
                "X_UTME": "X",
                "Y_UTMN": "Y",
                "Z_TVDSS": "Z",
            }
        )
        merged_df = pd.merge(compdat_df, grid_df_renamed, on=["I", "J", "K1"], how="left")
        # merged_df = merged_df.sort_values(by=["WELL", "Z"])
        print((merged_df.tail(20)))
        print(merged_df.columns)
        sim_wells_ret_arr = []
        for well, well_df in merged_df.groupby("WELL"):
            sim_wells_ret_arr.append(
                SimulationWell(
                    well_name=well,
                    realization=realization_num,
                    i_arr=well_df["I"].to_list(),
                    j_arr=well_df["J"].to_list(),
                    k_arr=well_df["K1"].to_list(),
                    x_arr=well_df["X"].to_list(),
                    y_arr=well_df["Y"].to_list(),
                    z_arr=well_df["Z"].to_list(),
                    open_shut=well_df["OP/SH"].to_list(),
                )
            )

        return sim_wells_ret_arr

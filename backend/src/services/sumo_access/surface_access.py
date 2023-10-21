import logging
from io import BytesIO
from typing import List, Optional

import xtgeo
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import SurfaceCollection

from src.services.utils.perf_timer import PerfTimer
from src.services.utils.statistic_function import StatisticFunction

from ._helpers import SumoEnsemble
from .surface_types import SurfaceMeta
from .generic_types import SumoContent, SumoContext

LOGGER = logging.getLogger(__name__)


class SurfaceAccess(SumoEnsemble):
    async def get_surface_directory(self) -> List[SurfaceMeta]:
        first_real: int = self.get_realizations()[0]

        real_surface_collection: SurfaceCollection = self._case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=first_real,
            stage=SumoContext.REALIZATION,
        )

        observed_surface_collection: SurfaceCollection = self._case.surfaces.filter(stage=SumoContext.CASE)

        surfs: List[SurfaceMeta] = []
        surfs.extend(await self._surface_collection_to_surface_meta_list(real_surface_collection))
        surfs.extend(await self._surface_collection_to_surface_meta_list(observed_surface_collection))

        return surfs

    async def _surface_collection_to_surface_meta_list(self, surface_collection: SurfaceCollection) -> SurfaceMeta:
        surfs: List[SurfaceMeta] = []
        async for surf in surface_collection:
            iso_string_or_time_interval = None

            t_start = surf["data"].get("time", {}).get("t0", {}).get("value", None)
            t_end = surf["data"].get("time", {}).get("t1", {}).get("value", None)
            if t_start and not t_end:
                iso_string_or_time_interval = t_start
            if t_start and t_end:
                iso_string_or_time_interval = f"{t_start}/{t_end}"

            surf_meta = SurfaceMeta(
                name=surf["data"]["name"],
                tagname=surf["data"].get("tagname", "Unknown"),
                iso_date_or_interval=iso_string_or_time_interval,
                content=surf["data"].get("content", SumoContent.DEPTH),
                is_observation=surf["data"]["is_observation"],
                is_stratigraphic=surf["data"]["stratigraphic"],
                zmin=surf["data"]["bbox"]["zmin"],
                zmax=surf["data"]["bbox"]["zmax"],
            )
            surfs.append(surf_meta)
        return surfs

    def get_realization_surface_data(
        self, real_num: int, name: str, attribute: str, time_or_interval_str: Optional[str] = None
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Get surface data for a realization surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, time_or_interval_str)
        time_filter = _time_or_interval_str_to_time_filter(time_or_interval_str)
        surface_collection = self._case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=real_num,
            name=name,
            tagname=attribute,
            time=time_filter,
            stage=SumoContext.REALIZATION,
        )

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No realization surface found in Sumo for {addr_str}")
            return None
        if surf_count > 1:
            LOGGER.warning(f"Multiple ({surf_count}) surfaces found in Sumo for: {addr_str}. Returning first surface.")

        sumo_surf = surface_collection[0]
        byte_stream: BytesIO = sumo_surf.blob
        xtgeo_surf = xtgeo.surface_from_file(byte_stream)

        LOGGER.debug(f"Got realization surface from Sumo in: {timer.elapsed_ms()}ms ({addr_str})")

        return xtgeo_surf

    def get_observed_surface_data(
        self, name: str, attribute: str, time_or_interval_str: Optional[str] = None
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Get surface data for an observed surface
        """
        timer = PerfTimer()
        time_filter = _time_or_interval_str_to_time_filter(time_or_interval_str)
        surface_collection = self._case.surfaces.filter(
            name=name,
            tagname=attribute,
            time=time_filter,
            stage=SumoContext.CASE,
        )

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No observed surface found in Sumo for {name}--{attribute}--{time_or_interval_str}")
            return None
        if surf_count > 1:
            LOGGER.warning(
                f"Multiple ({surf_count}) surfaces found in Sumo for: {name}--{attribute}--{time_or_interval_str}. Returning first surface."
            )

        sumo_surf = surface_collection[0]
        byte_stream: BytesIO = sumo_surf.blob
        xtgeo_surf = xtgeo.surface_from_file(byte_stream)

        LOGGER.debug(
            f"Got observed surface from Sumo in: {timer.elapsed_ms()}ms ({name}--{attribute}--{time_or_interval_str})"
        )

        return xtgeo_surf

    def get_statistical_surface_data(
        self,
        statistic_function: StatisticFunction,
        name: str,
        attribute: str,
        time_or_interval_str: Optional[str] = None,
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Compute statistic and return surface data
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(-1, name, attribute, time_or_interval_str)

        time_filter = _time_or_interval_str_to_time_filter(time_or_interval_str)
        et_get_case_ms = timer.lap_ms()

        surface_collection = self._case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            name=name,
            tagname=attribute,
            time=time_filter,
            stage=SumoContext.REALIZATION,
        )
        et_collect_surfaces_ms = timer.lap_ms()

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No statistical surfaces found in Sumo for {addr_str}")
            return None

        realizations = surface_collection.realizations

        xtgeo_surf = _compute_statistical_surface(statistic_function, surface_collection)
        et_calc_stat_ms = timer.lap_ms()

        if not xtgeo_surf:
            LOGGER.warning(f"Could not calculate statistical surface using Sumo for {addr_str}")
            return None

        LOGGER.debug(
            f"Calculated statistical surface using Sumo in: {timer.elapsed_ms()}ms ("
            f"get_case={et_get_case_ms}ms, "
            f"collect_surfaces={et_collect_surfaces_ms}ms, "
            f"calc_stat={et_calc_stat_ms}ms) "
            f"({addr_str} {len(realizations)=} )"
        )

        return xtgeo_surf

    def _make_addr_str(self, real_num: int, name: str, attribute: str, date_str: Optional[str]) -> str:
        addr_str = f"R:{real_num}__N:{name}__A:{attribute}__D:{date_str}__I:{self._iteration_name}__C:{self._case_uuid}"
        return addr_str


def _compute_statistical_surface(statistic: StatisticFunction, surface_coll: SurfaceCollection) -> xtgeo.RegularSurface:
    xtgeo_surf: xtgeo.RegularSurface = None
    if statistic == StatisticFunction.MIN:
        xtgeo_surf = surface_coll.min()
    elif statistic == StatisticFunction.MAX:
        xtgeo_surf = surface_coll.max()
    elif statistic == StatisticFunction.MEAN:
        xtgeo_surf = surface_coll.mean()
    elif statistic == StatisticFunction.P10:
        xtgeo_surf = surface_coll.p10()
    elif statistic == StatisticFunction.P90:
        xtgeo_surf = surface_coll.p90()
    elif statistic == StatisticFunction.P50:
        xtgeo_surf = surface_coll.p50()
    elif statistic == StatisticFunction.STD:
        xtgeo_surf = surface_coll.std()
    else:
        raise ValueError("Unhandled statistic function")

    return xtgeo_surf


def _time_or_interval_str_to_time_filter(time_or_interval_str: Optional[str]) -> TimeFilter:
    if time_or_interval_str is None:
        return TimeFilter(TimeType.NONE)

    timestamp_arr = time_or_interval_str.split("/", 1)
    if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
        raise ValueError("time_or_interval_str must contain a single timestamp or interval")
    if len(timestamp_arr) == 1:
        return TimeFilter(
            TimeType.TIMESTAMP,
            start=timestamp_arr[0],
            end=timestamp_arr[0],
            exact=True,
        )
    return TimeFilter(
        TimeType.INTERVAL,
        start=timestamp_arr[0],
        end=timestamp_arr[1],
        exact=True,
    )

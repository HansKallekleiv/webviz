import logging
from io import BytesIO
from typing import List, Optional

import xtgeo
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import Case, CaseCollection, SurfaceCollection
from sumo.wrapper import SumoClient

from src.services.utils.perf_timer import PerfTimer
from src.services.utils.statistic_function import StatisticFunction

from ._helpers import create_sumo_client_instance
from .surface_types import SurfaceMeta
from .generic_types import SumoContent
from ..utils.date_utils import iso_datetime_to_date, iso_datetime_to_date_interval

LOGGER = logging.getLogger(__name__)


class SurfaceAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name
        self._sumo_case_obj: Optional[Case] = None

    def get_surface_directory(self) -> List[SurfaceMeta]:
        case = self._get_my_sumo_case_obj()
        surface_collection: SurfaceCollection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=0,
        )

        surfs: List[SurfaceMeta] = []
        for s in surface_collection:
            iso_string_or_time_interval = None

            t_start = s["data"].get("time", {}).get("t0", {}).get("value", None)
            t_end = s["data"].get("time", {}).get("t1", {}).get("value", None)
            if t_start and not t_end:
                iso_string_or_time_interval = iso_datetime_to_date(t_start)
            if t_start and t_end:
                iso_string_or_time_interval = iso_datetime_to_date_interval(t_start, t_end)

            surf_meta = SurfaceMeta(
                name=s["data"]["name"],
                tagname=s["data"].get("tagname", "Unknown"),
                iso_date_or_interval=iso_string_or_time_interval,
                content=s["data"].get("content", SumoContent.DEPTH),
                is_observation=s["data"]["is_observation"],
                is_stratigraphic=s["data"]["stratigraphic"],
                zmin=s["data"]["bbox"]["zmin"],
                zmax=s["data"]["bbox"]["zmax"],
            )

            surfs.append(surf_meta)

        return surfs

    def get_dynamic_surf(
        self, real_num: int, name: str, attribute: str, time_or_interval_str: str
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Get actual surface data for a simulated dynamic surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, time_or_interval_str)

        # Must be either a string containing a time stamp or a time interval
        if not time_or_interval_str or len(time_or_interval_str) < 1:
            raise ValueError("time_or_interval_str must contain a non-empty string")

        timestamp_arr = time_or_interval_str.split("/", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")

        case = self._get_my_sumo_case_obj()

        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(
                TimeType.TIMESTAMP,
                start=timestamp_arr[0],
                end=timestamp_arr[0],
                exact=True,
            )
        else:
            time_filter = TimeFilter(
                TimeType.INTERVAL,
                start=timestamp_arr[0],
                end=timestamp_arr[1],
                exact=True,
            )

        surface_collection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=real_num,
            name=name,
            tagname=attribute,
            time=time_filter,
        )

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No dynamic surface found in Sumo for {addr_str}")
            return None
        if surf_count > 1:
            LOGGER.warning(f"Multiple ({surf_count}) surfaces found in Sumo for: {addr_str}. Returning first surface.")

        sumo_surf = surface_collection[0]
        byte_stream: BytesIO = sumo_surf.blob
        xtgeo_surf = xtgeo.surface_from_file(byte_stream)

        LOGGER.debug(f"Got dynamic surface from Sumo in: {timer.elapsed_ms()}ms ({addr_str})")

        return xtgeo_surf

    def get_statistical_dynamic_surf(
        self,
        statistic_function: StatisticFunction,
        name: str,
        attribute: str,
        time_or_interval_str: str,
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Compute statistic and return surface data for a dynamic surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(-1, name, attribute, time_or_interval_str)

        # Must be either a string containing a time stamp or a time interval
        if not time_or_interval_str or len(time_or_interval_str) < 1:
            raise ValueError("time_or_interval_str must contain a non-empty string")

        timestamp_arr = time_or_interval_str.split("--", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")

        case = self._get_my_sumo_case_obj()
        et_get_case_ms = timer.lap_ms()

        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(
                TimeType.TIMESTAMP,
                start=timestamp_arr[0],
                end=timestamp_arr[0],
                exact=True,
            )
        else:
            time_filter = TimeFilter(
                TimeType.INTERVAL,
                start=timestamp_arr[0],
                end=timestamp_arr[1],
                exact=True,
            )

        surface_collection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            name=name,
            tagname=attribute,
            time=time_filter,
        )
        et_collect_surfaces_ms = timer.lap_ms()

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No dynamic surfaces found in Sumo for {addr_str}")
            return None

        realizations = surface_collection.realizations

        xtgeo_surf = _compute_statistical_surface(statistic_function, surface_collection)
        et_calc_stat_ms = timer.lap_ms()

        if not xtgeo_surf:
            LOGGER.warning(f"Could not calculate dynamic statistical surface using Sumo for {addr_str}")
            return None

        LOGGER.debug(
            f"Calculated dynamic statistical surface using Sumo in: {timer.elapsed_ms()}ms ("
            f"get_case={et_get_case_ms}ms, "
            f"collect_surfaces={et_collect_surfaces_ms}ms, "
            f"calc_stat={et_calc_stat_ms}ms) "
            f"({addr_str} {len(realizations)=} )"
        )

        return xtgeo_surf

    def get_static_surf(self, real_num: int, name: str, attribute: str) -> Optional[xtgeo.RegularSurface]:
        """
        Get actual surface data for a static surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, None)

        case = self._get_my_sumo_case_obj()

        filter_no_time_data = TimeFilter(TimeType.NONE)
        surface_collection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=real_num,
            name=name,
            tagname=attribute,
            time=filter_no_time_data,
        )

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No static surface found in Sumo for {addr_str}")
            return None
        if surf_count > 1:
            LOGGER.warning(f"Multiple ({surf_count}) surfaces found in Sumo for: {addr_str}. Returning first surface.")

        sumo_surf = surface_collection[0]
        byte_stream: BytesIO = sumo_surf.blob
        xtgeo_surf = xtgeo.surface_from_file(byte_stream)

        LOGGER.debug(f"Got static surface from Sumo in: {timer.elapsed_ms()}ms ({addr_str})")

        return xtgeo_surf

    def get_statistical_static_surf(
        self, statistic_function: StatisticFunction, name: str, attribute: str
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Compute statistic and return surface data for a static surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(-1, name, attribute, None)

        case = self._get_my_sumo_case_obj()
        et_get_case_ms = timer.lap_ms()

        filter_no_time_data = TimeFilter(TimeType.NONE)
        surface_collection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            name=name,
            tagname=attribute,
            time=filter_no_time_data,
        )
        et_collect_surfaces_ms = timer.lap_ms()

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No static surfaces found in Sumo for {addr_str}")
            return None

        realizations = surface_collection.realizations

        xtgeo_surf = _compute_statistical_surface(statistic_function, surface_collection)
        et_calc_stat_ms = timer.lap_ms()

        if not xtgeo_surf:
            LOGGER.warning(f"Could not calculate static statistical surface using Sumo for {addr_str}")
            return None

        LOGGER.debug(
            f"Calculated static statistical surface using Sumo in: {timer.elapsed_ms()}ms ("
            f"get_case={et_get_case_ms}ms, "
            f"collect_surfaces={et_collect_surfaces_ms}ms, "
            f"calc_stat={et_calc_stat_ms}ms) "
            f"({addr_str} {len(realizations)=} )"
        )

        return xtgeo_surf

    def _get_my_sumo_case_obj(self) -> Case:
        """
        Get the Sumo case that we should be working on.
        Raises exception if case isn't found
        """
        if self._sumo_case_obj is None:
            case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
            if len(case_collection) != 1:
                raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

            self._sumo_case_obj = case_collection[0]

        return self._sumo_case_obj

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

from enum import Enum
import numpy as np
from pydantic import BaseModel
from xtgeo import Polygons
from .sumo_access.surface_access import SurfaceAccess
from .utils.statistic_function import StatisticFunction


class IntersectedStatisticalSurface(BaseModel):
    statistic: StatisticFunction
    # x_arr: list[float]
    # y_arr: list[float]
    abscissa_arr: list[float]
    ordinate_arr: list[float]


class IntersectionService:
    def __init__(self, polyline_xy):
        self.xtg_poly = Polygons(polyline_xy)

    def intersect_with_statistical_sumo_surfaces(
        self, surface_access: SurfaceAccess, surface_names: list[str], surface_attribute: str
    ) -> list[IntersectedStatisticalSurface]:
        intersect_surf_arr = []
        for statistic in StatisticFunction:
            xtgeo_surf = surface_access.get_statistical_static_surf(
                statistic_function=statistic,
                name=surface_names[0],
                attribute=surface_attribute,
            )
            fence_data = xtgeo_surf.get_randomline(self.xtg_poly)
            print(fence_data)
            intersect_surf_arr.append(
                IntersectedStatisticalSurface(
                    statistic=statistic,
                    # x_arr=fence_data[:, 0],
                    # y_arr=fence_data[:, 1],
                    ordinate_arr=fence_data[:, 0].astype(np.float64).tolist(),
                    abscissa_arr=fence_data[:, 1].astype(np.float64).tolist(),
                )
            )
        print(intersect_surf_arr)
        return intersect_surf_arr

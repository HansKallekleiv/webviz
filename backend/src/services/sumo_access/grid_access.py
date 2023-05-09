import logging
from io import BytesIO
from typing import List, Optional, Tuple

import numpy as np
from pydantic import BaseModel
import xtgeo
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import Case, CaseCollection, SurfaceCollection
from sumo.wrapper import SumoClient

from vtkmodules.util.numpy_support import (
    numpy_to_vtk,
    numpy_to_vtkIdTypeArray,
    vtk_to_numpy,
)
from vtkmodules.vtkCommonCore import vtkPoints
from vtkmodules.vtkCommonDataModel import (
    vtkCellArray,
    vtkDataSetAttributes,
    vtkExplicitStructuredGrid,
    vtkPolyData,
)
from vtkmodules.vtkFiltersGeometry import vtkExplicitStructuredGridSurfaceFilter
from src.services.utils.perf_timer import PerfTimer
from .surface_types import (
    StatisticFunction,
    DynamicSurfaceDirectory,
    StaticSurfaceDirectory,
)
from ._helpers import create_sumo_client_instance

LOGGER = logging.getLogger(__name__)


class GridGeometry(BaseModel):
    polys: List[float]
    points: List[float]
    xmin: float
    xmax: float
    ymin: float
    ymax: float
    zmin: float
    zmax: float


class GridAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name
        self._sumo_case_obj: Optional[Case] = None

    def get_grid_geometry(self, blob_id: str = "b35938eb-9698-b23c-4a78-c08c9094a0fe"):
        print("Downloading grid", flush=True)
        stream = self._sumo_client.get(f"/objects('{blob_id}')/blob")
        bytes = BytesIO(stream)
        grid_geom = xtgeo.grid_from_file(bytes)
        print("generating polydata", flush=True)
        grid_polys, grid_points, grid_scalar = get_surface(grid_geom)
        print("done", flush=True)
        # print("polys")

        grid_geometrics = grid_geom.get_geometrics(allcells=True, return_dict=True)
        print("xtgeo geometrics", flush=True)
        # print(grid_polys[0][0])
        # print("hei")
        return {"polys": grid_polys.tolist(), "points": grid_points.tolist(), **grid_geometrics}
        return GridGeometry(polys=[], points=[], **grid_geometrics)


def _create_vtk_esgrid_from_verts_and_conn(
    point_dims: np.ndarray, vertex_arr_np: np.ndarray, conn_arr_np: np.ndarray
) -> vtkExplicitStructuredGrid:
    vertex_arr_np = vertex_arr_np.reshape(-1, 3)
    points_vtkarr = numpy_to_vtk(vertex_arr_np, deep=1)
    vtk_points = vtkPoints()
    vtk_points.SetData(points_vtkarr)

    conn_idarr = numpy_to_vtkIdTypeArray(conn_arr_np, deep=1)
    vtk_cell_array = vtkCellArray()
    vtk_cell_array.SetData(8, conn_idarr)

    vtk_esgrid = vtkExplicitStructuredGrid()
    vtk_esgrid.SetDimensions(point_dims)
    vtk_esgrid.SetPoints(vtk_points)
    vtk_esgrid.SetCells(vtk_cell_array)

    vtk_esgrid.ComputeFacesConnectivityFlagsArray()

    return vtk_esgrid


def xtgeo_grid_to_vtk_explicit_structured_grid(
    xtg_grid: xtgeo.Grid,
) -> vtkExplicitStructuredGrid:
    # Create geometry data suitable for use with VTK's explicit structured grid
    # based on the specified xtgeo 3d grid
    pt_dims, vertex_arr, conn_arr, inactive_arr = xtg_grid.get_vtk_esg_geometry_data()
    vertex_arr[:, 2] *= -1

    vtk_esgrid = _create_vtk_esgrid_from_verts_and_conn(pt_dims, vertex_arr, conn_arr)

    # Make sure we hide the inactive cells.
    # First we let VTK allocate cell ghost array, then we obtain a numpy view
    # on the array and write to that (we're actually modifying the native VTK array)
    ghost_arr_vtk = vtk_esgrid.AllocateCellGhostArray()
    ghost_arr_np = vtk_to_numpy(ghost_arr_vtk)
    ghost_arr_np[inactive_arr] = vtkDataSetAttributes.HIDDENCELL

    return vtk_esgrid


def _calc_grid_surface(esgrid: vtkExplicitStructuredGrid) -> vtkPolyData:
    surf_filter = vtkExplicitStructuredGridSurfaceFilter()
    surf_filter.SetInputData(esgrid)
    surf_filter.PassThroughCellIdsOn()
    surf_filter.Update()

    polydata: vtkPolyData = surf_filter.GetOutput()
    return polydata


def get_surface(
    xtgeo_grid: xtgeo.Grid,
    xtgeo_grid_property: Optional[xtgeo.GridProperty] = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    es_grid = xtgeo_grid_to_vtk_explicit_structured_grid(xtgeo_grid)
    polydata = _calc_grid_surface(es_grid)
    points_np = vtk_to_numpy(polydata.GetPoints().GetData()).ravel()
    polys_np = vtk_to_numpy(polydata.GetPolys().GetData())
    print(polys_np[0])
    if xtgeo_grid_property is not None:
        fill_value = np.nan if not xtgeo_grid_property.isdiscrete else -1
        raw_scalar_np = xtgeo_grid_property.get_npvalues1d(order="F", fill_value=fill_value).ravel()

        original_cell_indices_np = vtk_to_numpy(polydata.GetCellData().GetAbstractArray("vtkOriginalCellIds"))

        mapped_scalar_np = raw_scalar_np[original_cell_indices_np]

        return (polys_np, points_np, mapped_scalar_np)
    return (polys_np, points_np, None)

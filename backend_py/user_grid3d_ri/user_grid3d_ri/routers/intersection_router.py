import logging
from typing import Sequence

import grpc
import numpy as np
from numpy.typing import NDArray
from fastapi import APIRouter, HTTPException

from rips.generated import GridGeometryExtraction_pb2, GridGeometryExtraction_pb2_grpc
from rips.instance import *

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from webviz_pkg.server_schemas.user_grid3d_ri import api_schemas

from user_grid3d_ri.logic.grid_properties import GridPropertiesExtractor
from user_grid3d_ri.logic.local_blob_cache import LocalBlobCache
from user_grid3d_ri.logic.resinsight_manager import RESINSIGHT_MANAGER

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.post("/get_polyline_intersection")
async def post_get_polyline_intersection(
    req_body: api_schemas.PolylineIntersectionRequest,
) -> api_schemas.PolylineIntersectionResponse:

    myfunc = "post_get_polyline_intersection()"
    LOGGER.debug(f"{myfunc}")
    # LOGGER.debug(f"{req_body.sas_token=}")
    # LOGGER.debug(f"{req_body.blob_store_base_uri=}")
    # LOGGER.debug(f"{req_body.grid_blob_object_uuid=}")
    # LOGGER.debug(f"{req_body.property_blob_object_uuid=}")
    # LOGGER.debug(f"{len(req_body.polyline_utm_xy)=}")

    perf_metrics = PerfMetrics()

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_grid_blob_downloaded_async(req_body.grid_blob_object_uuid)
    property_path_name = await blob_cache.ensure_property_blob_downloaded_async(req_body.property_blob_object_uuid)

    if grid_path_name is None:
        raise HTTPException(status_code=500, detail=f"Failed to download grid blob: {req_body.grid_blob_object_uuid=}")
    if property_path_name is None:
        raise HTTPException(
            status_code=500, detail=f"Failed to download property blob: {req_body.property_blob_object_uuid=}"
        )

    LOGGER.debug(f"{myfunc} - {grid_path_name=}")
    LOGGER.debug(f"{myfunc} - {property_path_name=}")
    perf_metrics.record_lap("get-blobs")

    grpc_channel: grpc.Channel = await RESINSIGHT_MANAGER.get_channel_for_running_ri_instance_async()
    perf_metrics.record_lap("get-ri")

    grid_geometry_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)
    grpc_request = GridGeometryExtraction_pb2.CutAlongPolylineRequest(
        gridFilename=grid_path_name,
        fencePolylineUtmXY=req_body.polyline_utm_xy,
    )

    grpc_response: GridGeometryExtraction_pb2.GetGridSurfaceResponse = grid_geometry_extraction_stub.CutAlongPolyline(
        grpc_request
    )
    perf_metrics.record_lap("ri-cut")

    LOGGER.debug(f"{len(grpc_response.fenceMeshSections)=}")

    prop_extractor = GridPropertiesExtractor.from_roff_property_file(property_path_name)
    perf_metrics.record_lap("read-props")

    ret_sections: list[api_schemas.FenceMeshSection] = []
    tot_num_vertices: int = 0
    tot_num_polys: int = 0
    for fence_idx, grpc_section in enumerate(grpc_response.fenceMeshSections):
        polys_arr_np = _build_vtk_style_polys(grpc_section.polyIndicesArr, grpc_section.verticesPerPolygonArr)
        prop_vals_list = prop_extractor.get_prop_values_for_cells_forced_to_float_list(grpc_section.sourceCellIndicesArr)

        section = api_schemas.FenceMeshSection(
            vertices_uz_arr=list(grpc_section.vertexArrayUZ),
            polys_arr=polys_arr_np.tolist(),
            poly_source_cell_indices_arr=list(grpc_section.sourceCellIndicesArr),
            poly_props_arr=prop_vals_list,
            start_utm_x=grpc_section.startUtmXY.x,
            start_utm_y=grpc_section.startUtmXY.y,
            end_utm_x=grpc_section.endUtmXY.x,
            end_utm_y=grpc_section.endUtmXY.y,
        )
        ret_sections.append(section)

        tot_num_vertices += int(len(grpc_section.vertexArrayUZ) / 2)
        tot_num_polys += len(grpc_section.sourceCellIndicesArr)

    perf_metrics.record_lap("process-sections")

    # This actually takes a bit of time (for many sections) - could use model_construct() for a slight perf gain
    ret_obj = api_schemas.PolylineIntersectionResponse(
        fence_mesh_sections=ret_sections,
        min_grid_prop_value=prop_extractor.get_min_global_val(),
        max_grid_prop_value=prop_extractor.get_max_global_val(),
        grid_dimensions=api_schemas.GridDimensions(
            i_count=grpc_response.gridDimensions.i,
            j_count=grpc_response.gridDimensions.j,
            k_count=grpc_response.gridDimensions.k,
        ),
        stats=None,
    )
    perf_metrics.record_lap("make-response")

    grpc_timeElapsedInfo = grpc_response.timeElapsedInfo
    ret_obj.stats = api_schemas.Stats(
        total_time=perf_metrics.get_elapsed_ms(),
        perf_metrics=perf_metrics.to_dict(),
        ri_total_time=grpc_timeElapsedInfo.totalTimeElapsedMs,
        ri_perf_metrics=dict(grpc_timeElapsedInfo.namedEventsAndTimeElapsedMs),
        vertex_count=tot_num_vertices,
        poly_count=tot_num_polys,
    )

    LOGGER.debug(f"{myfunc} - Got polyline intersection in: {perf_metrics.to_string_s()}")

    return ret_obj


def _build_vtk_style_polys(poly_indices_arr_np: Sequence[int], vertices_per_poly_arr_np: Sequence[int]) -> NDArray[np.uint32]:
    num_polys = len(vertices_per_poly_arr_np)
    polys_arr = np.empty(num_polys + len(poly_indices_arr_np), dtype=np.uint32)

    src_idx = 0
    dst_idx = 0
    for num_verts_in_poly in vertices_per_poly_arr_np:
        polys_arr[dst_idx] = num_verts_in_poly
        dst_idx += 1
        polys_arr[dst_idx : dst_idx + num_verts_in_poly] = poly_indices_arr_np[src_idx : src_idx + num_verts_in_poly]
        src_idx += num_verts_in_poly
        dst_idx += num_verts_in_poly

    return polys_arr


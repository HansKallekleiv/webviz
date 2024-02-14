import logging
from typing import List, Union, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, Body, Request

from src.services.sumo_access.surface_access import SurfaceAccess
from src.services.smda_access.stratigraphy_access import StratigraphyAccess
from src.services.smda_access.stratigraphy_utils import sort_stratigraphic_names_by_hierarchy
from src.services.smda_access.mocked_drogon_smda_access import _mocked_stratigraphy_access
from src.services.utils.statistic_function import StatisticFunction
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.utils.perf_timer import PerfTimer
from src.backend.auth.auth_helper import AuthHelper
from src.backend.utils.perf_metrics import PerfMetrics
from src.services.sumo_access._helpers import SumoCase
from src.services.surface_query_service.surface_query_service import batch_sample_surface_in_points_async
from src.services.surface_query_service.surface_query_service import RealizationSampleResult

from . import converters
from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/surface_directory/")
async def get_surface_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.SurfaceMeta]:
    """
    Get a directory of surfaces in a Sumo ensemble
    """
    surface_access = await SurfaceAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sumo_surf_dir = await surface_access.get_surface_directory_async()

    case_inspector = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    strat_column_identifier = await case_inspector.get_stratigraphic_column_identifier()
    strat_access: Union[StratigraphyAccess, _mocked_stratigraphy_access.StratigraphyAccess]

    if strat_column_identifier == "DROGON_HAS_NO_STRATCOLUMN":
        strat_access = _mocked_stratigraphy_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
    else:
        strat_access = StratigraphyAccess(authenticated_user.get_smda_access_token())
    strat_units = await strat_access.get_stratigraphic_units(strat_column_identifier)
    sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)

    return converters.to_api_surface_directory(sumo_surf_dir, sorted_stratigraphic_surfaces)


from typing import Any

import pydantic
from fastapi import Depends, HTTPException, Query
from pydantic import Json, ValidationError


def json_param(param_name: str, model: Any, **query_kwargs):
    """Parse JSON-encoded query parameters as pydantic models.
    The function returns a `Depends()` instance that takes the JSON-encoded value from
    the query parameter `param_name` and converts it to a Pydantic model, defined
    by the `model` attribute.
    """

    def get_parsed_object(value: Json = Query(alias=param_name, **query_kwargs)):
        try:
            return pydantic.parse_obj_as(model, value)
        except ValidationError as err:
            raise HTTPException(400, detail=err.errors())

    return Depends(get_parsed_object)


@router.get("/test2")
def test2(
    surface_address: schemas.SurfaceAddress = json_param(
        "surface_address", schemas.SurfaceAddress, description="User object"
    )
):
    return {"message": f"Hello, {surface_address!r}"}


@router.post("/get_surface_data")
async def post_get_surface_data(
    surface_address: schemas.SurfaceAddress,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.SurfaceData:
    access = await SurfaceAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), surface_address.case_uuid, surface_address.ensemble_name
    )
    surface_type = surface_address.address_type

    if surface_type == schemas.SurfaceAddressType.REALIZATION:
        xtgeo_surf = await access.get_realization_surface_data_async(
            real_num=surface_address.realization_num,
            name=surface_address.name,
            attribute=surface_address.attribute,
            time_or_interval_str=surface_address.iso_date_or_interval,
        )
    elif surface_type == schemas.SurfaceAddressType.STATISTICAL:
        service_stat_func_to_compute = StatisticFunction.from_string_value(surface_address.statistic_function)
        if service_stat_func_to_compute is not None:
            xtgeo_surf = await access.get_statistical_surface_data_async(
                statistic_function=service_stat_func_to_compute,
                name=surface_address.name,
                attribute=surface_address.attribute,
                time_or_interval_str=surface_address.iso_date_or_interval,
            )
    elif surface_type == schemas.SurfaceAddressType.OBSERVATION:
        xtgeo_surf = access.get_observed_surface_data_async(
            name=surface_address.name,
            attribute=surface_address.attribute,
            time_or_interval_str=surface_address.iso_date_or_interval,
        )
    else:
        raise HTTPException(status_code=404, detail="Invalid surface address type")

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Surface not found")

    return converters.to_api_surface_data(xtgeo_surf)


# pylint: disable=too-many-arguments
@router.post("/get_resampled_surface_data/")
async def post_get_resampled_surface_data(
    response: Response,
    surface_address: schemas.SurfaceAddress,
    grid_definition: schemas.SurfaceGridDefinition,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.SurfaceData:

    perf_metrics = PerfMetrics(response)
    access = await SurfaceAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), surface_address.case_uuid, surface_address.ensemble_name
    )
    surface_type = surface_address.address_type

    if surface_type == schemas.SurfaceAddressType.REALIZATION:
        xtgeo_surf_property = await access.get_realization_surface_data_async(
            real_num=surface_address.realization_num,
            name=surface_address.name,
            attribute=surface_address.attribute,
            time_or_interval_str=surface_address.iso_date_or_interval,
        )
    elif surface_type == schemas.SurfaceAddressType.STATISTICAL:
        service_stat_func_to_compute = StatisticFunction.from_string_value(surface_address.statistic_function)
        if service_stat_func_to_compute is not None:
            xtgeo_surf_property = await access.get_statistical_surface_data_async(
                statistic_function=service_stat_func_to_compute,
                name=surface_address.name,
                attribute=surface_address.attribute,
                time_or_interval_str=surface_address.iso_date_or_interval,
            )
    elif surface_type == schemas.SurfaceAddressType.OBSERVATION:
        xtgeo_surf_property = access.get_observed_surface_data_async(
            name=surface_address.name,
            attribute=surface_address.attribute,
            time_or_interval_str=surface_address.iso_date_or_interval,
        )
    else:
        raise HTTPException(status_code=404, detail="Invalid surface address type")

    if not xtgeo_surf_property:
        raise HTTPException(status_code=404, detail="Surface not found")

    perf_metrics.record_lap("prop-surf")

    if not xtgeo_surf_property:
        raise HTTPException(status_code=404, detail="Surface not found")

    resampled_surface = converters.resample_property_surface_to_mesh_surface(grid_definition, xtgeo_surf_property)
    perf_metrics.record_lap("resample")
    surf_data_response: schemas.SurfaceData = converters.to_api_surface_data(resampled_surface)
    perf_metrics.record_lap("convert")

    LOGGER.debug(f"Loaded property surface in: {perf_metrics.to_string()}")

    return surf_data_response


@router.post("get_surface_intersection")
async def post_get_surface_intersection(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval_str: Optional[str] = Query(None, description="Time point or time interval string"),
    cumulative_length_polyline: schemas.SurfaceIntersectionCumulativeLengthPolyline = Body(embed=True),
) -> schemas.SurfaceIntersectionData:
    """Get surface intersection data for requested surface name.

    The surface intersection data for surface name contains: An array of z-points, i.e. one z-value/depth per (x, y)-point in polyline,
    and cumulative lengths, the accumulated length at each z-point in the array.
    """
    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    intersection_polyline = converters.from_api_cumulative_length_polyline_to_xtgeo_polyline(cumulative_length_polyline)

    surface_intersection = await access.get_realization_surface_intersection_async(
        real_num=realization_num,
        name=name,
        attribute=attribute,
        polyline=intersection_polyline,
        time_or_interval_str=time_or_interval_str,
    )

    surface_intersection_response = converters.to_api_surface_intersection(surface_intersection)

    return surface_intersection_response


@router.post("/sample_surface_in_points")
async def post_sample_surface_in_points(
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    surface_name: str = Query(description="Surface name"),
    surface_attribute: str = Query(description="Surface attribute"),
    realization_nums: List[int] = Query(description="Realization numbers"),
    sample_points: schemas.PointSetXY = Body(embed=True),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.SurfaceRealizationSampleValues]:

    sumo_access_token = authenticated_user.get_sumo_access_token()

    result_arr: List[RealizationSampleResult] = await batch_sample_surface_in_points_async(
        sumo_access_token=sumo_access_token,
        case_uuid=case_uuid,
        iteration_name=ensemble_name,
        surface_name=surface_name,
        surface_attribute=surface_attribute,
        realizations=realization_nums,
        x_coords=sample_points.x_points,
        y_coords=sample_points.y_points,
    )

    intersections: List[schemas.SurfaceRealizationSampleValues] = []
    for res in result_arr:
        intersections.append(
            schemas.SurfaceRealizationSampleValues(
                realization=res.realization,
                sampled_values=res.sampledValues,
            )
        )

    return intersections

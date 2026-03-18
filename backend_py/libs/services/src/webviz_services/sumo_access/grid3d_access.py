import logging
import asyncio
from typing import Any, List, Optional, TypeVar

from pydantic import BaseModel, ValidationError
from fmu.sumo.explorer.explorer import SumoClient, SearchContext
from fmu.sumo.explorer.objects import CPGrid

# The underlying scheme of metadata is in fmu.datamodels
from fmu.datamodels.fmu_results.data import BoundingBox3D, PropertyData
from fmu.datamodels.fmu_results.specification import CPGridPropertySpecification, CPGridSpecification

from webviz_core_utils.timestamp_utils import iso_str_to_date_str
from webviz_services.service_exceptions import InvalidDataError, Service
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)
ModelT = TypeVar("ModelT", bound=BaseModel)


class Grid3dBoundingBox(BaseModel):
    """Bounding box for a 3D grid geometry"""

    xmin: float
    ymin: float
    zmin: float
    xmax: float
    ymax: float
    zmax: float


class Grid3dZone(BaseModel):
    """Named subset of 3D grid layers (Zone)"""

    name: str
    start_layer: int
    end_layer: int


class Grid3dDimensions(BaseModel):
    """Specification of a 3D grid geometry"""

    i_count: int
    j_count: int
    k_count: int
    subgrids: List[Grid3dZone]


class Grid3dCodename(BaseModel):
    """Named discrete code for a 3D grid property"""

    code: int
    name: str


class Grid3dPropertyInfo(BaseModel):
    """Metadata for a 3D grid property"""

    property_name: str
    is_discrete: bool
    codenames: Optional[List[Grid3dCodename]] = None
    iso_date_or_interval: Optional[str] = None


class Grid3dInfo(BaseModel):
    """Metadata for a 3D grid model, including its properties and geometry"""

    grid_name: str
    bbox: Grid3dBoundingBox
    dimensions: Grid3dDimensions
    property_info_arr: List[Grid3dPropertyInfo]


class Grid3dAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "Grid3dAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_models_info_arr_async(self, realization: int) -> List[Grid3dInfo]:
        """Get metadata for all 3D grid models, including bbox, dimensions and properties"""

        grid3d_search_context = self._ensemble_context.grids.filter(realization=realization)

        # Run loop in parallel as function for creating meta is async
        sumo_grid_uuids: list[str] = await grid3d_search_context.uuids_async
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(_get_grid_model_meta_async(grid3d_search_context, uuid)) for uuid in sumo_grid_uuids
            ]
        grid_meta_arr: list[Grid3dInfo] = [task.result() for task in tasks]

        return grid_meta_arr


async def _get_grid_model_meta_async(sumo_grid3d_search_context: SearchContext, grid_uuid: str) -> Grid3dInfo:
    """
    Get grid object from SUMO using grid search context and grid uuid, and create metadata for the grid model.

    This is a helper function for Grid3dAccess.get_models_info_arr_async

    Note that in fmu-sumo the grid properties metadata are related to a grid geometry via data.geometry.relative_path.keyword
    Older metadata using e.g. name or tagname for the grid geometry relationship are not supported.
    """
    # Get the grid object from the search context
    sumo_grid_object = await sumo_grid3d_search_context.get_object_async(grid_uuid)
    if not isinstance(sumo_grid_object, CPGrid):
        raise InvalidDataError(f"Did not get expected CPGrid object type for {grid_uuid=}", Service.SUMO)

    grid_metadata = sumo_grid_object.metadata
    grid_data = grid_metadata.get("data")
    if not isinstance(grid_data, dict):
        raise InvalidDataError(f"Grid metadata for {grid_uuid=} did not contain a valid data block", Service.SUMO)

    bbox_model = _validate_fmu_model(BoundingBox3D, grid_data.get("bbox"), f"grid bounding box for {grid_uuid=}")
    grid_spec = _validate_fmu_model(CPGridSpecification, grid_data.get("spec"), f"grid specification for {grid_uuid=}")

    bbox = Grid3dBoundingBox.model_validate(bbox_model.model_dump())
    dimensions = Grid3dDimensions(
        i_count=grid_spec.ncol,
        j_count=grid_spec.nrow,
        k_count=grid_spec.nlay,
        subgrids=[
            Grid3dZone(name=zone.name, start_layer=zone.min_layer_idx, end_layer=zone.max_layer_idx)
            for zone in (grid_spec.zonation or [])
        ],
    )
    property_info_arr = await _get_grid_properties_info_async(sumo_grid_object)
    grid3d_info = Grid3dInfo(
        grid_name=grid_data["name"],
        bbox=bbox,
        dimensions=dimensions,
        property_info_arr=property_info_arr,
    )

    return grid3d_info


async def _get_grid_properties_info_async(cpgrid: CPGrid) -> List[Grid3dPropertyInfo]:
    """
    Get grid properties metadata for a given CPGrid object.
    This is a helper function to extract property metadata from a CPGrid instance.
    """
    property_info_arr: List[Grid3dPropertyInfo] = []

    async for grid_property in cpgrid.grid_properties:
        property_info_arr.append(_create_grid_property_info(grid_property.metadata))

    property_info_arr.sort(key=lambda item: (item.property_name, item.iso_date_or_interval or ""))

    return property_info_arr


def _validate_fmu_model(model_cls: type[ModelT], raw_data: Any, context: str) -> ModelT:
    try:
        return model_cls.model_validate(raw_data)
    except ValidationError as err:
        raise InvalidDataError(f"Invalid {context}: {err}", Service.SUMO) from err


def _create_grid_property_info(property_metadata: Any) -> Grid3dPropertyInfo:
    if not isinstance(property_metadata, dict):
        raise InvalidDataError("Grid property metadata did not have the expected structure", Service.SUMO)

    property_data_raw = property_metadata.get("data")
    property_data = _validate_fmu_model(PropertyData, property_data_raw, "grid property data")

    property_spec: Optional[CPGridPropertySpecification] = None
    if isinstance(property_data_raw, dict) and property_data_raw.get("spec") is not None:
        property_spec = _validate_fmu_model(
            CPGridPropertySpecification,
            property_data_raw.get("spec"),
            f"grid property specification for {property_data.name}",
        )

    is_discrete = bool(property_data.property and property_data.property.is_discrete)

    return Grid3dPropertyInfo(
        property_name=property_data.name,
        is_discrete=is_discrete,
        codenames=_create_codenames(property_spec.codenames) if is_discrete and property_spec else None,
        iso_date_or_interval=_make_iso_date_or_interval(property_data),
    )


def _create_codenames(codenames: Optional[dict[int, str]]) -> Optional[List[Grid3dCodename]]:
    if not codenames:
        return None

    return [Grid3dCodename(code=code, name=name) for code, name in sorted(codenames.items())]


def _make_iso_date_or_interval(property_data: PropertyData) -> Optional[str]:
    if property_data.time is None:
        return None

    t0 = iso_str_to_date_str(property_data.time.t0.value.isoformat())
    if property_data.time.t1 is None:
        return t0

    t1 = iso_str_to_date_str(property_data.time.t1.value.isoformat())
    return f"{t0}/{t1}"

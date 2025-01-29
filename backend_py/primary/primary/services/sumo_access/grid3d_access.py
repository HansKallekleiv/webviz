import logging
from typing import List, Optional

from pydantic import BaseModel
from fmu.sumo.explorer.explorer import SumoClient

from primary.services.service_exceptions import MultipleDataMatchesError, NoDataError, Service

from ._helpers import create_sumo_client


LOGGER = logging.getLogger(__name__)


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


class Grid3dPropertyInfo(BaseModel):
    """Metadata for a 3D grid property"""

    property_name: str
    iso_date_or_interval: Optional[str] = None


class Grid3dInfo(BaseModel):
    """Metadata for a 3D grid model, including its properties and geometry"""

    grid_name: str
    bbox: Grid3dBoundingBox
    dimensions: Grid3dDimensions
    property_info_arr: List[Grid3dPropertyInfo]


class Grid3dAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "Grid3dAccess":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return Grid3dAccess(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_models_info_arr_async(self, realization: int) -> List[Grid3dInfo]:
        """Get metadata for all 3D grid models, including bbox, dimensions and properties"""
        return []

    async def get_properties_info_arr_async(
        self, grid3d_geometry_name: str, realization: int
    ) -> List[Grid3dPropertyInfo]:
        """Get metadata for grid properties belonging to a grid geometry"""
        return []

    async def is_geometry_shared_async(self, grid3d_geometry_name: str) -> bool:
        """Check if a grid geometry is shared across all realizations"""

        return True

    async def get_geometry_blob_id_async(self, grid3d_geometry_name: str, realization: int) -> str:
        """Get the blob id of a grid geometry"""

        return ""

    async def get_property_blob_id_async(self, grid3d_geometry_name: str, property_name: str, realization: int) -> str:
        """Get the uuid of a grid property"""
        return ""

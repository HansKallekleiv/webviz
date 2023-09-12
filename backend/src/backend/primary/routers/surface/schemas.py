from enum import Enum
from typing import Optional

from pydantic import BaseModel


class SurfaceStatisticFunction(str, Enum):
    MEAN = "MEAN"
    STD = "STD"
    MIN = "MIN"
    MAX = "MAX"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"


class SurfaceAttributeType(str, Enum):
    """Enum for the different possible types of surfaces (domain specific)."""

    DEPTH = "depth"
    TIME = "time"
    PROPERTY = "property"
    SEISMIC = "seismic"
    THICKNESS = "thickness"


class SurfaceMeta(BaseModel):
    stratigraphic_name: str
    stratigraphic_name_is_official: bool
    attribute_name: str
    attribute_type: SurfaceAttributeType
    iso_date_or_interval: Optional[str]
    is_observation: bool
    zmin: float
    zmax: float


class SurfaceData(BaseModel):
    x_ori: float
    y_ori: float
    x_count: int
    y_count: int
    x_inc: float
    y_inc: float
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    val_min: float
    val_max: float
    rot_deg: float
    mesh_data: str

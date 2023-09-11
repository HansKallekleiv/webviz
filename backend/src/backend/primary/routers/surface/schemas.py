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


class SurfaceMeta(BaseModel):
    name: str
    tagname: str
    t_start: Optional[str]
    t_end: Optional[str]
    content: str
    is_observation: bool
    is_stratigraphic: bool
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

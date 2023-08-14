from enum import Enum
from typing import Union, List
from pydantic import BaseModel, Field

from src.services.smda_access.types import WellBoreHeader


class SmdaWellIdent(BaseModel):
    well_uuid: str


class IntersectionSpec(BaseModel):
    source: Union[SmdaWellIdent, str]
    extent: list[float] = [50, 50]


class IntersectionPolyLineType(str, Enum):
    POLYLINE = "polyline"
    WELL = "well"
    REALIZATION_SURFACE = "realization_surface"
    STATISTICAL_SURFACE = "statistical_surface"


class StaticSurfaceRealizationsIntersectionRequest(BaseModel):
    intersection_spec: IntersectionSpec
    case_uuid: str = Field(description="Sumo case uuid")
    ensemble_name: str = Field(description="Ensemble name")
    name: str = Field(description="Surface name")
    attribute: str = Field(description="Surface attribute")
    realizations: List[int] = Field(None, description="Realization")


class IntersectionPolyLine(BaseModel):
    name: str
    type: IntersectionPolyLineType
    x_arr: list[float]
    y_arr: list[float]

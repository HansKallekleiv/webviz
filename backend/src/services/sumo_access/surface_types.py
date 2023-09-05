from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class DynamicSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    date_strings: List[str]

    @classmethod
    def create_empty(cls) -> DynamicSurfaceDirectory:
        return cls(attributes=[], names=[], date_strings=[])


class StaticSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    valid_attributes_for_name: List[List[int]]

    @classmethod
    def create_empty(cls) -> StaticSurfaceDirectory:
        return cls(attributes=[], names=[])


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

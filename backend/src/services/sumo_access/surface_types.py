from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


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

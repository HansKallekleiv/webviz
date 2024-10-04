from typing import List
from pydantic import BaseModel

class WellZonesInfo(BaseModel):
    well_names: List[str]
    zone_names: List[str]
    zone_codes: List[int]

class WellZonePick(BaseModel):
    well_name: str
    zone_name: str
    zone_code: int
    x: float
    y: float
    top_tvd: float
    base_tvd: float
    top_md: float
    base_md: float


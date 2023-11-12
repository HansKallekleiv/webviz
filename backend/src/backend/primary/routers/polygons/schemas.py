from typing import List, Optional
from enum import Enum

from pydantic import BaseModel


class PolygonsAttributeType(str, Enum):
    """A surface has a single array with values, e.g. depth, time, property, seismic, thickness.
    Only surfaces with depth and time have z-values that can be plotted in 3D.
    The other attributes are scalar values that can be plotted in 2D or used as colormapping for 3D surfaces.

    Ideally if the attribute is a scalar, there should be corresponding z-values, but this information is not
    available in the metadata.

    To be revisited later when the metadata is more mature.

    """

    DEPTH = "depth"  # Values are depths
    TIME = "time"  # Values are time (ms)
    PROPERTY = "property"  # Values are generic, but typically extracted from a gridmodel
    SEISMIC = "seismic"  # Values are extracted from a seismic cube
    THICKNESS = "thickness"  # Values are isochores (real or conceptual difference between two depth surfaces)
    ISOCHORE = "isochore"  # Values are isochores (real or conceptual difference between two depth surfaces)
    FLUID_CONTACT = "fluid_contact"  # Values are fluid contacts (oil-water, gas-water, etc.)
    FIELD_OUTLINE = "field_outline"  # Values are field outlines
    PINCHOUT = "pinchout"  # Values are pinchouts
    SUBCROP = "subcrop"  # Values are subcrops


class PolygonsMeta(BaseModel):
    name: str  # Svarte fm. top / Svarte fm. / Svarte fm. base
    name_is_stratigraphic_offical: bool
    stratigraphic_identifier: Optional[str] = None  # Svarte fm.
    relative_stratigraphic_level: Optional[int] = None
    parent_stratigraphic_identifier: Optional[str] = None
    attribute_name: str
    attribute_type: PolygonsAttributeType


class PolygonData(BaseModel):
    x_arr: List[float]
    y_arr: List[float]
    z_arr: List[float]
    poly_id: int | str
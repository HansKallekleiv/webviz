from typing import List

from .queries.get_stratigraphic_units import get_stratigraphic_units
from .types import StratigraphicUnit, StratigraphicSurface
from .stratigraphy_utils import sort_stratigraphic_names_by_hierarchy, sort_stratigraphic_units_by_hierarchy


class StratigraphyAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    def get_stratigraphic_units(self, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
        """Get stratigraphic units for stratigraphic column in lithostratigraphical order."""
        stratigraphic_units = get_stratigraphic_units(self._smda_token, stratigraphic_column_identifier)

        sorted_units = sort_stratigraphic_units_by_hierarchy(stratigraphic_units)
        return sorted_units

    def get_stratigraphic_surfaces(self, stratigraphic_column_identifier: str) -> List[StratigraphicSurface]:
        """Get a flatten list of top/unit/base surface names in lithostratigraphical order"""
        stratigraphic_units = get_stratigraphic_units(self._smda_token, stratigraphic_column_identifier)

        sorted_units = sort_stratigraphic_names_by_hierarchy(stratigraphic_units)
        return sorted_units

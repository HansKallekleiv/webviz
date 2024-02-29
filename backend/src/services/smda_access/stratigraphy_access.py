from typing import List

from .queries.get_stratigraphic_units import get_stratigraphic_units
from .queries.get_wellbore_stratigraphy import get_wellbore_stratigraphy
from .types import StratigraphicUnit, WellBoreStratigraphy


class StratigraphyAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    async def get_stratigraphic_units(self, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
        """Get stratigraphic units for a given stratigraphic column"""
        return await get_stratigraphic_units(self._smda_token, stratigraphic_column_identifier)

    async def get_stratigraphic_units_for_wellbore(
        self, wellbore_uuid: str, stratigraphic_column_identifier: str
    ) -> List[WellBoreStratigraphy]:
        """Get stratigraphic units for a given wellbore and stratigraphic column"""
        return await get_wellbore_stratigraphy(self._smda_token, wellbore_uuid, stratigraphic_column_identifier)
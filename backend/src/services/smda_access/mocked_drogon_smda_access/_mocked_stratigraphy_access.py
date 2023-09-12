from typing import List


from ..types import StratigraphicUnit
from ..stratigraphy_access import sort_stratigraphic_names_by_hierarchy, sort_stratigraphic_units_by_hierarchy

STRAT_UNITS = [
    StratigraphicUnit(
        identifier="Valysar Fm.",
        top="Valysar Fm. Top",
        base="Valysar Fm. Base",
        color_r=255,
        color_g=165,
        color_b=0,
        strat_unit_level=2,
        strat_unit_type="formation",
        strat_unit_parent="VOLANTIS GP.",
    ),
    StratigraphicUnit(
        identifier="Therys Fm.",
        top="Therys Fm. Top",
        base="Therys Fm. Base",
        color_r=255,
        color_g=255,
        color_b=0,
        strat_unit_level=2,
        strat_unit_type="formation",
        strat_unit_parent="VOLANTIS GP.",
    ),
    StratigraphicUnit(
        identifier="Volon Fm.",
        top="Volon Fm. Top",
        base="Volon Fm. Base",
        color_r=143,
        color_g=188,
        color_b=143,
        strat_unit_level=2,
        strat_unit_type="formation",
        strat_unit_parent="VOLANTIS GP.",
    ),
    StratigraphicUnit(
        identifier="VOLANTIS GP.",
        top="VOLANTIS GP. Top",
        base="VOLANTIS GP. Base",
        color_r=255,
        color_g=165,
        color_b=0,
        strat_unit_level=1,
        strat_unit_type="group",
        strat_unit_parent=None,
    ),
]


class StratigraphyAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    # type: ignore
    # pylint: disable=unused-argument
    def get_stratigraphic_units(self, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
        return sort_stratigraphic_units_by_hierarchy(STRAT_UNITS)

    # type: ignore
    # pylint: disable=unused-argument
    def get_stratigraphic_names(self, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
        print(sort_stratigraphic_names_by_hierarchy(STRAT_UNITS))
        return sort_stratigraphic_names_by_hierarchy(STRAT_UNITS)

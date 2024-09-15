from primary.services.smda_access.types import StratigraphicUnit

from . import schemas


def convert_stratigraphic_unit_to_schema(
    stratigraphic_unit: StratigraphicUnit,
) -> schemas.StratigraphicUnit:
    return schemas.StratigraphicUnit(
        identifier=stratigraphic_unit.identifier,
        top=stratigraphic_unit.top,
        base=stratigraphic_unit.base,
        stratUnitLevel=stratigraphic_unit.strat_unit_level,
        stratUnitType=stratigraphic_unit.strat_unit_type,
        topAge=stratigraphic_unit.top_age,
        baseAge=stratigraphic_unit.base_age,
        stratUnitParent=stratigraphic_unit.strat_unit_parent,
        colorR=stratigraphic_unit.color_r,
        colorG=stratigraphic_unit.color_g,
        colorB=stratigraphic_unit.color_b,
        lithologyType=stratigraphic_unit.lithology_type,
    )


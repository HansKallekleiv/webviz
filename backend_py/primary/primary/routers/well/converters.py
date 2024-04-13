from typing import List

from primary.services.smda_access.types import WellBorePick, StratigraphicUnit
from primary.services.ssdl_access.schemas import WellboreLogCurveData

from . import schemas


def convert_wellbore_picks_to_schema(wellbore_picks: List[WellBorePick]) -> List[schemas.WellBorePick]:
    return [
        schemas.WellBorePick(
            northing=pick.northing,
            easting=pick.easting,
            tvd=pick.tvd,
            tvdMsl=pick.tvd_msl,
            md=pick.md,
            mdMsl=pick.md_msl,
            uniqueWellboreIdentifier=pick.unique_wellbore_identifier,
            pickIdentifier=pick.pick_identifier,
            confidence=pick.confidence,
            depthReferencePoint=pick.depth_reference_point,
            mdUnit=pick.md_unit,
        )
        for pick in wellbore_picks
    ]


def convert_stratigraphic_units_to_schema(
    stratigraphic_units: List[StratigraphicUnit],
) -> List[schemas.StratigraphicUnit]:
    return [
        schemas.StratigraphicUnit(
            identifier=unit.identifier,
            top=unit.top,
            base=unit.base,
            stratUnitLevel=unit.strat_unit_level,
            stratUnitType=unit.strat_unit_type,
            topAge=unit.top_age,
            baseAge=unit.base_age,
            stratUnitParent=unit.strat_unit_parent,
            colorR=unit.color_r,
            colorG=unit.color_g,
            colorB=unit.color_b,
            lithologyType=unit.lithology_type,
        )
        for unit in stratigraphic_units
    ]

def convert_log_curve_to_schema(log_curve: WellboreLogCurveData) -> schemas.WellboreLogCurveData:
    md_arr = [datapoint[0] for datapoint in log_curve.DataPoints]
    value_arr = [datapoint[1] for datapoint in log_curve.DataPoints]
    return schemas.WellboreLogCurveData(
        index_min=log_curve.index_min,
        index_max=log_curve.index_max,
        min_curve_value=log_curve.min_curve_value,
        max_curve_value=log_curve.max_curve_value,
        md_arr=md_arr,
        value_arr=value_arr,
        curve_alias=log_curve.curve_alias,
        curve_description=log_curve.curve_description,
        index_unit=log_curve.index_unit,
        no_data_value=log_curve.no_data_value
    )
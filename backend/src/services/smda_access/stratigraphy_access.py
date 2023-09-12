from typing import List, Dict

from .queries.get_stratigraphic_units import get_stratigraphic_units
from .types import StratigraphicUnit


class StratigraphyAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    def get_stratigraphic_units(self, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
        """Get stratigraphic units for stratigraphic column in lithostratigraphical order."""
        stratigraphic_units = get_stratigraphic_units(self._smda_token, stratigraphic_column_identifier)

        sorted_units = sort_stratigraphic_units_by_hierarchy(stratigraphic_units)
        return sorted_units

    def get_stratigraphic_names(self, stratigraphic_column_identifier: str) -> List[str]:
        """Get a flatten list of top/unit/base surface names in lithostratigraphical order"""
        stratigraphic_units = get_stratigraphic_units(self._smda_token, stratigraphic_column_identifier)

        sorted_units = sort_stratigraphic_names_by_hierarchy(stratigraphic_units)
        return sorted_units


def create_hierarchical_structure(strat_units: List[StratigraphicUnit]) -> List[StratigraphicUnit]:
    """Organizes the stratigraphic units into a hierarchical nested list based on parent relationships."""
    unit_by_id = {unit.identifier: {"unit": unit, "children": []} for unit in strat_units}
    roots = []

    for unit in strat_units:
        if unit.strat_unit_parent and unit.strat_unit_parent in unit_by_id:
            parent = unit_by_id[unit.strat_unit_parent]
            parent["children"].append(unit)
        else:
            roots.append(unit)

    return roots


def flatten_hierarchical_structure(units: List[StratigraphicUnit], unit_by_id: Dict) -> List[StratigraphicUnit]:
    """Flatten the hierarchical structure into a single list of stratigraphic units, preserving the order."""
    flattened_list = []

    for unit in units:
        flattened_list.append(unit)
        if unit.identifier in unit_by_id:
            flattened_list.extend(flatten_hierarchical_structure(unit_by_id[unit.identifier]["children"], unit_by_id))

    return flattened_list


def flatten_hierarchical_structure_to_surface_name(units: List[StratigraphicUnit], unit_by_id: Dict) -> List[str]:
    """Flatten the hierarchical structure into a single list of stratigraphical top/unit/base names, preserving the order."""
    flattened_list = []

    for unit in units:
        flattened_list.append(unit.top)
        flattened_list.append(unit.identifier)
        if unit.identifier in unit_by_id:
            flattened_list.extend(
                flatten_hierarchical_structure_to_surface_name(unit_by_id[unit.identifier]["children"], unit_by_id)
            )
        flattened_list.append(unit.base)
    return flattened_list


def sort_stratigraphic_names_by_hierarchy(strat_units: List[StratigraphicUnit]) -> List[StratigraphicUnit]:
    """Sort stratigraphic top/unit/base by hierarchy."""
    unit_by_id = {unit.identifier: {"unit": unit, "children": []} for unit in strat_units}

    for unit in strat_units:
        if unit.strat_unit_parent and unit.strat_unit_parent in unit_by_id:
            unit_by_id[unit.strat_unit_parent]["children"].append(unit)

    roots = [data["unit"] for data in unit_by_id.values() if not data["unit"].strat_unit_parent]
    sorted_units = flatten_hierarchical_structure_to_surface_name(roots, unit_by_id)
    return sorted_units


def sort_stratigraphic_units_by_hierarchy(strat_units: List[StratigraphicUnit]) -> List[StratigraphicUnit]:
    """Sort stratigraphic units by hierarchy."""
    unit_by_id = {unit.identifier: {"unit": unit, "children": []} for unit in strat_units}

    for unit in strat_units:
        if unit.strat_unit_parent and unit.strat_unit_parent in unit_by_id:
            unit_by_id[unit.strat_unit_parent]["children"].append(unit)

    roots = [data["unit"] for data in unit_by_id.values() if not data["unit"].strat_unit_parent]
    sorted_units = flatten_hierarchical_structure(roots, unit_by_id)
    return sorted_units

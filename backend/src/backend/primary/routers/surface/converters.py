from typing import List

import orjson
import xtgeo
from src.services.sumo_access.surface_types import SurfaceMeta as SumoSurfaceMeta
from src.services.smda_access.types import StratigraphicSurface
from src.services.utils.surface_to_float32 import surface_to_float32_array
from . import schemas


def resample_property_surface_to_mesh_surface(
    mesh_surface: xtgeo.RegularSurface, property_surface: xtgeo.RegularSurface
) -> xtgeo.RegularSurface:
    """
    Regrid property surface to mesh surface if topology is different
    """
    if mesh_surface.compare_topology(property_surface):
        return property_surface

    mesh_surface.resample(property_surface)
    return mesh_surface


def to_api_surface_data(xtgeo_surf: xtgeo.RegularSurface) -> schemas.SurfaceData:
    """
    Create API SurfaceData from xtgeo regular surface
    """
    float32values = surface_to_float32_array(xtgeo_surf)

    return schemas.SurfaceData(
        x_ori=xtgeo_surf.xori,
        y_ori=xtgeo_surf.yori,
        x_count=xtgeo_surf.ncol,
        y_count=xtgeo_surf.nrow,
        x_inc=xtgeo_surf.xinc,
        y_inc=xtgeo_surf.yinc,
        x_min=xtgeo_surf.xmin,
        x_max=xtgeo_surf.xmax,
        y_min=xtgeo_surf.ymin,
        y_max=xtgeo_surf.ymax,
        val_min=xtgeo_surf.values.min(),
        val_max=xtgeo_surf.values.max(),
        rot_deg=xtgeo_surf.rotation,
        mesh_data=orjson.dumps(float32values).decode(),
    )


def to_api_surface_directory(
    sumo_surface_dir: List[SumoSurfaceMeta], stratigraphical_names: List[StratigraphicSurface]
) -> List[schemas.SurfaceMeta]:
    """
    Convert Sumo surface directory to API surface directory
    """
    surface_metas: List[schemas.SurfaceMeta] = []
    for sumo_meta in sumo_surface_dir:
        surface_metas.append(_sumo_surface_meta_to_api(sumo_meta))

    surface_metas = _sort_by_stratigraphical_order(surface_metas, stratigraphical_names)
    return surface_metas


def _sumo_surface_meta_to_api(sumo_meta: SumoSurfaceMeta) -> schemas.SurfaceMeta:
    return schemas.SurfaceMeta(
        stratigraphic_name=sumo_meta.name,
        stratigraphic_name_is_official=sumo_meta.is_stratigraphic,
        attribute_name=sumo_meta.tagname,
        attribute_type=schemas.SurfaceAttributeType(sumo_meta.content.value),  # Map SumoContent to SurfaceAttributeType
        iso_date_or_interval=sumo_meta.iso_date_or_interval,
        is_observation=sumo_meta.is_observation,
        value_min=sumo_meta.zmin,
        value_max=sumo_meta.zmax,
    )


def _sort_by_stratigraphical_order(
    surface_metas: List[schemas.SurfaceMeta], stratigraphic_surfaces: List[StratigraphicSurface]
) -> List[schemas.SurfaceMeta]:
    """Sort the surface meta list by the order they appear in the stratigraphic column.
    Non-stratigraphical surfaces are appended at the end of the list."""

    surface_metas_with_official_strat_name = []
    surface_metas_with_custom_names = []

    for strat_surface in stratigraphic_surfaces:
        for surface_meta in surface_metas:
            if surface_meta.stratigraphic_name == strat_surface.name:
                surface_meta.stratigraphic_name_is_official = True
                surface_meta.stratigraphic_feature = strat_surface.feature
                surface_metas_with_official_strat_name.append(surface_meta)

    # Append non-official strat names
    for surface_meta in surface_metas:
        if surface_meta.stratigraphic_name not in [
            s.stratigraphic_name for s in surface_metas_with_official_strat_name
        ]:
            surface_meta.stratigraphic_name_is_official = False
            surface_metas_with_custom_names.append(surface_meta)

    return surface_metas_with_official_strat_name + surface_metas_with_custom_names

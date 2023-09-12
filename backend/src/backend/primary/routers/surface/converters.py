from typing import List

import orjson
import xtgeo
from src.services.sumo_access.surface_types import SurfaceMeta as SumoSurfaceMeta
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


def to_api_surface_directory(sumo_surface_dir: List[SumoSurfaceMeta]) -> List[schemas.SurfaceMeta]:
    """
    Convert Sumo surface directory to API surface directory
    """
    surface_metas: List[schemas.SurfaceMeta] = []
    for sumo_meta in sumo_surface_dir:
        surface_metas.append(_sumo_surface_meta_to_api(sumo_meta))
    return surface_metas


def _sumo_surface_meta_to_api(sumo_meta: SumoSurfaceMeta) -> schemas.SurfaceMeta:
    return schemas.SurfaceMeta(
        stratigraphic_name=sumo_meta.name,
        stratigraphic_name_is_official=sumo_meta.is_stratigraphic,
        attribute_name=sumo_meta.tagname,
        attribute_type=schemas.SurfaceAttributeType(sumo_meta.content.value),  # Map SumoContent to SurfaceAttributeType
        iso_date_or_interval=sumo_meta.iso_date_or_interval,
        is_observation=sumo_meta.is_observation,
        zmin=sumo_meta.zmin,
        zmax=sumo_meta.zmax,
    )

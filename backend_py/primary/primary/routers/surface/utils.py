import numpy as np
from xtgeo import _cxtgeo
from xtgeo.common.constants import UNDEF_LIMIT

from .schemas import SurfaceWellPick, PickDirection


def get_surface_picks_from_xtgeo(
    surf,
    unique_wellbore_identifier: str,
    xvalues: list[float],
    yvalues: list[float],
    zvalues: list[float],
    mdvalues: list[float],
) -> list[SurfaceWellPick] | None:
    """Calculate surface/well intersections (wellpicks).
    Uses the underlying xtgeo C-extension directly for performance."""

    xarray = np.array(xvalues, dtype=np.float32)
    yarray = np.array(yvalues, dtype=np.float32)
    zarray = np.array(zvalues, dtype=np.float32)
    mdarray = np.array(mdvalues, dtype=np.float32)

    # nval = number of valid picks
    # xres, yres, zres = arrays of x,y,z coordinates of picks
    # mres = array of measured depth values of picks
    # dres = array of direction indicators of picks (1=downward, 0=upward)
    nval, xres, yres, zres, mres, dres = _cxtgeo.well_surf_picks(
        xarray,
        yarray,
        zarray,
        mdarray,
        surf.ncol,
        surf.nrow,
        surf.xori,
        surf.yori,
        surf.xinc,
        surf.yinc,
        surf.yflip,
        surf.rotation,
        surf.npvalues1d,
        xarray.size,
        yarray.size,
        zarray.size,
        mdarray.size,
        mdarray.size,
    )
    if nval < 1:
        return None

    mres[mres > UNDEF_LIMIT] = np.nan

    res: list[SurfaceWellPick] = []
    for i in range(nval):
        res.append(
            SurfaceWellPick(
                unique_wellbore_identifier=unique_wellbore_identifier,
                x=xres[i],
                y=yres[i],
                z=zres[i],
                md=mres[i],
                direction=PickDirection.DOWNWARD if dres[i] == 1 else PickDirection.UPWARD,
            )
        )
    return res

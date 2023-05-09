import datetime
from typing import Dict, Union, NamedTuple
import psutil
from fastapi import APIRouter, Depends, Response
from functools import lru_cache
from src.backend.auth.auth_helper import AuthHelper, AuthenticatedUser
from src.services.sumo_access.grid_access import GridAccess, GridGeometry

import orjson

router = APIRouter()

START_TIME_CONTAINER = datetime.datetime.now()

grid_data = None


def human_readable(psutil_object: NamedTuple) -> Dict[str, Union[str, Dict[str, str]]]:
    return {
        key: f"{getattr(psutil_object, key):.1f} %"
        if key == "percent"
        else f"{getattr(psutil_object, key) / (1024**3):.2f} GiB"
        for key in psutil_object._fields
    }


@router.get("/user_session_container")
async def user_session_container(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> dict:
    """Get information about user session container, like when it was started
    together with memory and disk usage. NB! Note that a session container is started
    if one is not already running when accessing this endpoint.

    For explanation of the different memory metrics, see e.g. psutil documentation like
    * https://psutil.readthedocs.io/en/latest/index.html?highlight=Process()#psutil.virtual_memory
    * https://psutil.readthedocs.io/en/latest/index.html?highlight=Process()#psutil.Process
    """

    return {
        "username": authenticated_user.get_username(),
        "start_time_container": START_TIME_CONTAINER,
        "root_disk_system": human_readable(psutil.disk_usage("/")),
        "memory_system": human_readable(psutil.virtual_memory()),
        "memory_python_process": human_readable(psutil.Process().memory_info()),
    }


@router.get("/grid", response_model=GridGeometry)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
async def grid(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """

    griddata = get_grid(authenticated_user.get_sumo_access_token())
    print("Sending data to primary", flush=True)

    # using orjson instead of slow FastAPI default encoder (json.dumps)
    return Response(orjson.dumps(griddata), media_type="application/json")


@lru_cache
def get_grid(token: str):
    grid_access = GridAccess(token, None, None)

    return grid_access.get_grid_geometry()

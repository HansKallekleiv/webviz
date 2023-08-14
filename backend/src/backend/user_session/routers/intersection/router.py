# type: ignore
# for now
from functools import cache
from typing import List, Tuple
import logging
import os, psutil

import numpy as np
import orjson
import xtgeo

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import ORJSONResponse
from src.backend.auth.auth_helper import AuthenticatedUser, AuthHelper

from src.services.utils.perf_timer import PerfTimer

from src.backend.primary.routers.intersection import schemas

router = APIRouter()
LOGGER = logging.getLogger(__name__)


@router.post("/static_surface_realizations", response_model=List[schemas.IntersectionPolyLine])
async def static_surface_realizations(
    request: Request,
    body: schemas.StaticSurfaceRealizationsIntersectionRequest,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    print("HELLO2", flush=True)
    print(request.query_params, flush=True)
    # return ORJSONResponse(grid_surface_payload.dict())
    return []

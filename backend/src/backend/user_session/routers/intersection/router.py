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


@router.get("/well_polyline", response_model=schemas.IntersectionPolyLine)
async def well_polyline(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    case_uuid = request.query_params.get("case_uuid")
    ensemble_name = request.query_params.get("ensemble_name")
    grid_name = request.query_params.get("grid_name")
    realization = request.query_params.get("realization")

    # return ORJSONResponse(grid_surface_payload.dict())

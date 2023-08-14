from fastapi import APIRouter, Depends
from starlette.requests import Request
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper
from src.backend.primary.user_session_proxy import proxy_to_user_session

from src.services.sumo_access.grid_access import GridAccess
from . import schemas
from src.services.smda_access.types import WellBoreHeader

router = APIRouter()

# Primary backend
@router.post("/static_surface_realizations")
async def compute_static_surface_realizations(
    request: Request,
    body: schemas.StaticSurfaceRealizationsIntersectionRequest,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.IntersectionPolyLine]:
    """
    Get a polyline for a well for an intersection
    """

    query_params = {
        "body": body,
    }

    # Add query parameters to the request URL
    updated_request = Request(
        scope={
            "type": "http",
            "method": request.method,
            "path": request.url.path,
            "query_string": request.url.include_query_params(**query_params).query.encode("utf-8"),
            "headers": request.headers.raw,
        },
        receive=request._receive,
    )

    response = await proxy_to_user_session(updated_request, authenticated_user)
    return response

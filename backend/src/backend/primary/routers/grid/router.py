from fastapi import APIRouter, Depends, Request
from typing import Any

from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper
from src.backend.primary.user_session_proxy import proxy_to_user_session

from src.services.sumo_access.grid_access import GridGeometry

router = APIRouter()


@router.get("/grid_geometry")
async def grid_geometry(
    request: Request, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> GridGeometry:
    """Get a grid"""
    grid_geometry: GridGeometry = await proxy_to_user_session(request, authenticated_user)
    return grid_geometry

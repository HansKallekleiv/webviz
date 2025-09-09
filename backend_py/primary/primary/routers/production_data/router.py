import logging
from typing import List, Union

from fastapi import APIRouter, Depends, Query

from primary.services.smda_access.drogon import DrogonSmdaAccess
from primary.services.smda_access import SmdaAccess
from primary.services.pdm_access.pdm_access import PDMAccess
from primary.services.smda_access import GeologyAccess as SmdaGeologyAccess
from primary.services.service_exceptions import NoDataError

from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper
from primary.utils.drogon import is_drogon_identifier

from primary.services.ssdl_access.well_access import WellAccess as SsdlWellAccess
from primary.services.ssdl_access.drogon import DrogonWellAccess


from primary.middleware.add_browser_cache import add_custom_cache_time
from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/per_well_production_in_time_interval/")
async def get_per_well_production_in_time_interval(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    start_date: str = Query(description="Start date in YYYY-MM-DD"),
    end_date: str = Query(description="End date in YYYY-MM-DD"),
    # fmt:on
) -> list[schemas.WellProductionData]:
    """Get per well production for all wells in the field in the time interval"""
    pdm_access = PDMAccess(authenticated_user.get_pdm_access_token())
    prod_data = await pdm_access.get_per_well_production_in_time_interval_async(
        field_identifier=field_identifier, start_date=start_date, end_date=end_date
    )
    return converters.per_well_production_data_to_api(prod_data)


@router.get("/per_well_injection_in_time_interval/")
async def get_per_well_injection_in_time_interval(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    start_date: str = Query(description="Start date in YYYY-MM-DD"),
    end_date: str = Query(description="End date in YYYY-MM-DD"),
    # fmt:on
) -> list[schemas.WellInjectionData]:
    """Get per well injection for all wells in the field in the time interval"""
    pdm_access = PDMAccess(authenticated_user.get_pdm_access_token())
    data = await pdm_access.get_per_well_injection_in_time_interval_async(
        field_identifier=field_identifier, start_date=start_date, end_date=end_date
    )
    return converters.per_well_injection_data_to_api(data)

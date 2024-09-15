import logging
from typing import List, Union

from fastapi import APIRouter, Depends, Query

from primary.services.smda_access.mocked_drogon_smda_access import (
    WellAccess as MockedSmdaWellAccess,
    StratigraphyAccess as MockedStratigraphyAccess,
)
from primary.services.smda_access.well_access import WellAccess as SmdaWellAccess
from primary.services.smda_access.stratigraphy_access import StratigraphyAccess
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.case_inspector import CaseInspector

from primary.services.ssdl_access.well_access import WellAccess as SsdlWellAccess

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/stratigraphic_units/")
async def get_stratigraphic_units(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"), # Should be field identifier?
    # fmt:on
) -> List[schemas.StratigraphicUnit]:
    
    
    stratigraphy_access: Union[StratigraphyAccess, MockedStratigraphyAccess]

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    stratigraphic_column_identifier = await case_inspector.get_stratigraphic_column_identifier_async()

    # Handle DROGON
    field_identifiers = await case_inspector.get_field_identifiers_async()
    if "DROGON" in field_identifiers:
        
        stratigraphy_access = MockedStratigraphyAccess(authenticated_user.get_smda_access_token())

    else:
        
        stratigraphy_access = StratigraphyAccess(authenticated_user.get_smda_access_token())

    stratigraphic_units = await stratigraphy_access.get_stratigraphic_units(stratigraphic_column_identifier)
    

    return [
            converters.convert_stratigraphic_unit_to_schema(stratigraphic_unit)
            for stratigraphic_unit in stratigraphic_units
        ]
    


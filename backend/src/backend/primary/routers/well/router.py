import logging
from typing import List, Union

from fastapi import APIRouter, Depends, Query

from src.services.smda_access import mocked_drogon_smda_access
from src.services.sumo_access.well_access import WellAccess as SumoWellAccess, BlockedWellLog
from src.services.smda_access.well_access import WellAccess
from src.services.smda_access.stratigraphy_access import StratigraphyAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper
from src.services.sumo_access._helpers import SumoCase
from src.services.smda_access.types import WellBoreHeader, WellBoreTrajectory, WellBoreStratigraphy

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()

@router.get("/bw_names")
async def get_blocked_well_log_names(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Iteration name"),
    # fmt:on
) -> List[str]:
    """Retrieve the available blocked well log names for the case"""
    sumo_well_access = await SumoWellAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    return await sumo_well_access.get_blocked_well_log_names()

@router.get("/bw_logs")
async def get_blocked_well_logs(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Iteration name"),
    well_name: str = Query(description="Well name"),
    # fmt:on
) -> List[BlockedWellLog]:
    """Retrieve the available blocked well logs for the case"""
    sumo_well_access = await SumoWellAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    return await sumo_well_access.get_blocked_well_logs(well_name)

@router.get("/wellbore_stratigraphy/")
async def get_wellbore_stratigraphy(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[WellBoreStratigraphy]:
    """Get stratigraphy for a wellbore"""
    stratigraphy_access: Union[StratigraphyAccess, mocked_drogon_smda_access.StratigraphyAccess]

    sumo_case = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    stratigraphic_column_identifier = await sumo_case.get_stratigraphic_column_identifier()

    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        stratigraphy_access = mocked_drogon_smda_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
    else:
        stratigraphy_access = StratigraphyAccess(authenticated_user.get_smda_access_token())

    strat =await stratigraphy_access.get_stratigraphic_units_for_wellbore(
        wellbore_uuid, stratigraphic_column_identifier
    )
    import pandas as pd
    strat_df = pd.DataFrame([stratitem.dict() for stratitem in strat])
    strat_df = strat_df.drop(columns=["wellbore_uuid"])
    df = strat_df
        
    # Sort and prepare the DataFrame for processing
    df_sorted = df.sort_values(by=['entry_md', 'strat_unit_level'])

    # Initialize data structure
    data = []

    # Track the latest strat unit identifiers for each level
    latest_strat_units = {}

    for _, row in df_sorted.iterrows():
        md = row['entry_md']
        level = row['strat_unit_level']
        identifier = row['strat_unit_identifier']
        
        # Update the latest identifier for the current level and clear any higher levels
        latest_strat_units[level] = identifier
        for lvl in list(latest_strat_units.keys()):
            if lvl > level:
                del latest_strat_units[lvl]
        
        # Construct the data row
        data_row = [md] + [latest_strat_units.get(lvl) for lvl in range(1, max(df['strat_unit_level']) + 1)]
        
        # Add or update the data row
        if not data or data[-1][0] != md:
            data.append(data_row)
        else:
            data[-1] = data_row

    # Handle the final exit_md, ensuring it's represented if not already the last entry_md
    final_exit_md = df['exit_md'].max()
    if data[-1][0] != final_exit_md:
        data.append([final_exit_md] + [None] * max(df['strat_unit_level']))

    # Define curves manually
    curves = [
        {"name": "MD", "description": "Measured depth", "quantity": "length", "unit": "m", "valueType": "float", "dimensions": 1}
    ] + [
        {"name": f"Strat unit level {i}", "description": f"Stratigraphic level {i}", "quantity": "", "unit": "", "valueType": "string", "dimensions": 1}
        for i in range(1, max(df['strat_unit_level']) + 1)
    ]

    # Construct the final JSON
    well_log_json = {
        "curves": curves,
        "data": data
    }
    import json
    # Print the JSON structure
    # print(json.dumps(well_log_json, indent=4))

    return strat
@router.get("/well_headers/")
async def get_well_headers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    # Should be field identifier
    # fmt:on
) -> List[WellBoreHeader]:
    """Get well headers for all wells in the field"""

    case_inspector = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    field_identifier = (await case_inspector.get_field_identifiers())[0]
    well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_well_headers(field_identifier=field_identifier)


@router.get("/field_well_trajectories/")
async def get_field_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"), # Should be field identifier?
    unique_wellbore_identifiers:List[str] =  Query(None, description="Optional subset of well names")
    # fmt:on
) -> List[WellBoreTrajectory]:
    """Get well trajectories for field"""
    case_inspector = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    field_identifier = (await case_inspector.get_field_identifiers())[0]
    well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_field_wellbore_trajectories(
        field_identifier=field_identifier, unique_wellbore_identifiers=unique_wellbore_identifiers
    )


@router.get("/well_trajectories/")
async def get_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuids: List[str] = Query(description="Wellbore uuids"),
    # fmt:on
) -> List[WellBoreTrajectory]:
    """Get well trajectories"""
    well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]

    # Handle DROGON
    if all(x in ["drogon_horizontal", "drogon_vertical"] for x in wellbore_uuids):
        well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_wellbore_trajectories(wellbore_uuids=wellbore_uuids)


@router.get("/wellbore_picks_and_stratigraphic_units/")
async def get_wellbore_picks_and_stratigraphic_units(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"), # Should be field identifier?
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> schemas.WellBorePicksAndStratigraphicUnits:
    """Get well bore picks for a single well bore"""
    well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]
    stratigraphy_access: Union[StratigraphyAccess, mocked_drogon_smda_access.StratigraphyAccess]

    sumo_case = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    stratigraphic_column_identifier = await sumo_case.get_stratigraphic_column_identifier()

    # Handle DROGON
    field_identifiers = await sumo_case.get_field_identifiers()
    if "DROGON" in field_identifiers:
        well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
        stratigraphy_access = mocked_drogon_smda_access.StratigraphyAccess(authenticated_user.get_smda_access_token())

    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())
        stratigraphy_access = StratigraphyAccess(authenticated_user.get_smda_access_token())

    stratigraphic_units = await stratigraphy_access.get_stratigraphic_units(stratigraphic_column_identifier)
    wellbore_picks = await well_access.get_all_picks_for_wellbore(wellbore_uuid=wellbore_uuid)

    return schemas.WellBorePicksAndStratigraphicUnits(
        wellbore_picks=converters.convert_wellbore_picks_to_schema(wellbore_picks),
        stratigraphic_units=converters.convert_stratigraphic_units_to_schema(stratigraphic_units),
    )

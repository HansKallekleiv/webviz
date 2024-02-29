from typing import List

from src.services.utils.perf_timer import PerfTimer
from ..types import WellBoreStratigraphy
from ._get_request import get


async def get_wellbore_stratigraphy(
    access_token: str, wellbore_uuid: str, stratigraphic_column_identifier: str
) -> List[WellBoreStratigraphy]:
    """Returns the wellbore stratigraphy ."""
    endpoint = "wellbore-stratigraphy"
    params = {
        # "unique_wellbore_identifier": "NO 34/4-D-1 H",
        "wellbore_uuid":wellbore_uuid,
        "strat_column_identifier": stratigraphic_column_identifier,
        "_sort": "entry_md",
        "_projection": "wellbore_uuid,entry_md,exit_md,entry_tvd,exit_tvd,strat_unit_identifier,strat_unit_level,strat_unit_type,interpreter,color_r,color_g,color_b",
    }
    results = await get(access_token=access_token, endpoint=endpoint, params=params)
    timer = PerfTimer()
    import json
    # print(json.dumps(results,indent=4))
    well_strat = [WellBoreStratigraphy(**result) for result in results]
    endpoint = "wellbore-completions"
    params = {"wellbore_uuid": wellbore_uuid}
    result = await get(access_token=access_token, endpoint=endpoint, params=params)
    print(json.dumps(result,indent=4))
    
    return well_strat
    # strat_units = [StratigraphicUnit(**result) for result in results]
    # print(f"TIME SMDA validate stratigraphic units {timer.lap_s():.2f} seconds")
    # return strat_units

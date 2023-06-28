from typing import List, Optional

from src.services.utils.perf_timer import PerfTimer
from ..types import WellBorePick
from ._get_request import get


def get_wellbore_picks_for_field(
    access_token: str,
    field_identifier: str,
    pick_identifier: str,
    interpreter: str = "STAT",
    obs_no: Optional[int] = None,
) -> List[WellBorePick]:
    """
    Returns the first observed wellbore pick for a given identifier(formation top/base)
    for all wells in a field
    """
    endpoint = "wellbore-picks"
    params = {
        "_sort": "unique_wellbore_identifier,md",
        "field_identifier": field_identifier,
        "pick_identifier": pick_identifier,
        "interpreter": interpreter,
    }
    if obs_no:
        params["obs_no"] = obs_no

    results = get(access_token=access_token, endpoint=endpoint, params=params)
    timer = PerfTimer()
    picks = [WellBorePick(**result) for result in results]
    print(f"TIME SMDA validate wellbore picks took {timer.lap_s():.2f} seconds")
    return picks

from typing import List


from src.services.utils.perf_timer import PerfTimer

from ._get_request import get


async def get_completions_for_wellbore(access_token: str, wellbore_uuid: str) -> List[str]:
    endpoint = f"Wellbores/{wellbore_uuid}/completion"

    timer = PerfTimer()
    result = await get(access_token=access_token, endpoint=endpoint)
    print(f"TIME SSDL fetch completions for wellbore {wellbore_uuid} took {timer.lap_s():.2f} seconds")
    print("********************************************************")
    print(result)
    return result  # [WellBoreHeader(**result) for result in result]

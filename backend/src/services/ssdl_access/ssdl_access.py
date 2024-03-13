from typing import List, Optional


from .queries._get_completions import get_completions_for_wellbore


class SsdlAccess:
    def __init__(self, access_token: str):
        self._ssdl_token = access_token

    async def get_completions_for_wellbore(self, wellbore_uuid: str) -> List[str]:
        wellbore_picks = await get_completions_for_wellbore(
            access_token=self._ssdl_token,
            wellbore_uuid=wellbore_uuid,
        )
        return wellbore_picks

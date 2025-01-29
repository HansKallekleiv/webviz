from typing import List
from pydantic import BaseModel

from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from ._helpers import create_sumo_client, get_fields


class FieldInfo(BaseModel):
    identifier: str


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str


class SumoInspector:
    def __init__(self, access_token: str):
        self._sumo_client: SumoClient = create_sumo_client(access_token)

    async def get_fields_async(self) -> List[FieldInfo]:
        """Get list of fields"""
        field_idents = await get_fields(self._sumo_client)
        field_idents = sorted(list(set(field_idents)))

        return [FieldInfo(identifier=field_ident) for field_ident in field_idents]

    async def get_cases_async(self, field_identifier: str) -> List[CaseInfo]:
        search_context = SearchContext(
            self._sumo_client, must=[{"term": {"masterdata.smda.field.identifier.keyword": field_identifier}}]
        )
        cases = await search_context.cases_async
        case_info_arr: List[CaseInfo] = []

        for case in cases:

            case_info_arr.append(CaseInfo(uuid=case.uuid, name=case.name, status=case.status, user=case.user))

        # Sort on case name before returning
        case_info_arr.sort(key=lambda case_info: case_info.name)

        return case_info_arr

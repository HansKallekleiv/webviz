from typing import List
from pydantic import BaseModel
import logging

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
import asyncio

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from ._helpers import create_sumo_client, get_fields

LOGGER = logging.getLogger(__name__)


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
        timer = PerfMetrics()
        field_idents = await get_fields(self._sumo_client)
        timer.record_lap("get_fields")
        field_idents = sorted(list(set(field_idents)))
        LOGGER.debug(timer.to_string())
        return [FieldInfo(identifier=field_ident) for field_ident in field_idents]

    async def _get_case_info(self, case_uuid: str) -> CaseInfo:
        search_context = SearchContext(self._sumo_client)
        case = await search_context.get_case_by_uuid_async(case_uuid)
        return CaseInfo(uuid=case.uuid, name=case.name, status=case.status, user=case.user)

    async def get_cases_async(self, field_identifier: str) -> List[CaseInfo]:
        """Get list of cases for specified field"""
        timer = PerfMetrics()
        search_context = SearchContext(self._sumo_client)
        field_context = search_context.filter(field=field_identifier)
        cases = await field_context.cases_async
        timer.record_lap("get case uuids")

        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(self._get_case_info(case_uuid)) for case_uuid in cases.uuids]

        case_info_arr: List[CaseInfo] = [task.result() for task in tasks]
        timer.record_lap("get_cases_for_field")
        case_info_arr = sorted(case_info_arr, key=lambda case_info: case_info.name)
        LOGGER.debug(timer.to_string())
        return case_info_arr

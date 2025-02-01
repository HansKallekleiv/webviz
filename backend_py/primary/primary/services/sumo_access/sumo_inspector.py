from typing import List
from pydantic import BaseModel
import logging

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
import asyncio

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from ._helpers import create_sumo_client

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
        search_context = SearchContext(self._sumo_client)
        field_names = await search_context._get_field_values_async("masterdata.smda.field.identifier.keyword")
        timer.record_lap("get_fields")
        field_idents = sorted(list(set(field_names)))
        LOGGER.debug(timer.to_string())
        return [FieldInfo(identifier=field_ident) for field_ident in field_idents]

    async def get_cases_async(self, field_identifier: str) -> List[CaseInfo]:
        """Get list of cases for specified field"""
        timer = PerfMetrics()
        search_context = SearchContext(self._sumo_client)
        field_context = search_context.filter(field=field_identifier, cls="case")
        cases = await field_context.cases_async
        timer.record_lap("get case uuids")

        case_info_arr: List[CaseInfo] = []
        for case in cases:
            case_info_arr.append(CaseInfo(uuid=case.uuid, name=case.name, status=case.status, user=case.user))

        timer.record_lap("get_cases_for_field")
        case_info_arr = sorted(case_info_arr, key=lambda case_info: case_info.name)
        LOGGER.debug(timer.to_string())
        return case_info_arr

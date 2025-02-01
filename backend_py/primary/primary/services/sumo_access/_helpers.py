import logging
from fmu.sumo.explorer.objects._search_context import SearchContext
from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects import Case
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary import config
from primary.services.service_exceptions import Service, NoDataError

LOGGER = logging.getLogger(__name__)


def create_sumo_client(access_token: str) -> SumoClient:
    timer = PerfMetrics()
    if access_token == "DUMMY_TOKEN_FOR_TESTING":  # nosec bandit B105
        sumo_client = SumoClient(env=config.SUMO_ENV, interactive=False)
    else:
        sumo_client = SumoClient(env=config.SUMO_ENV, token=access_token, interactive=False)
    timer.record_lap("create_sumo_client")
    LOGGER.debug(timer.to_string())
    return sumo_client


async def create_sumo_case_async(client: SumoClient, case_uuid: str, want_keepalive_pit: bool) -> Case:
    timer = PerfMetrics()

    search_context = SearchContext(client)
    try:
        case = await search_context.get_case_by_uuid_async(case_uuid)
    except Exception as exc:
        raise NoDataError(f"Sumo case not found for {case_uuid=}", Service.SUMO) from exc

    timer.record_lap("create_sumo_case")

    LOGGER.debug(timer.to_string())

    return case


async def get_fields(client: SumoClient) -> list[str]:
    timer = PerfMetrics()
    search_context = SearchContext(client)
    field_names = await search_context._get_field_values_async("masterdata.smda.field.identifier.keyword")
    timer.record_lap("Get Sumo field names")
    LOGGER.debug(timer.to_string())
    return field_names

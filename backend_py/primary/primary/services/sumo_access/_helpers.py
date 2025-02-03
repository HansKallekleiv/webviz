import logging
from fmu.sumo.explorer.objects._search_context import SearchContext

from fmu.sumo.explorer.objects import Case
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary import config
from primary.services.service_exceptions import Service, NoDataError
from sumo.wrapper import RetryStrategy, SumoClient
from sumo.wrapper._auth_provider import AuthProviderAccessToken
import httpx
from primary.httpx_client import http_client, http_sync_client

LOGGER = logging.getLogger(__name__)


class FastSumoClient(SumoClient):
    def __init__(self, access_token: str, env: str):
        self.env = env
        self._verbosity = "CRITICAL"

        self._retry_strategy = RetryStrategy()
        self._client = None
        self._async_client = http_client.client
        # self._client = http_sync_client.client
        self.base_url = f"https://main-sumo-{env}.radix.equinor.com/api/v1"
        self._timeout = httpx.Timeout(30.0)
        self.auth = AuthProviderAccessToken(access_token)

    async def __aexit__(self, exc_type, exc_value, traceback):
        # await self._async_client.aclose()
        # self._async_client = None
        return False

    def __del__(self):
        pass


def create_sumo_client(access_token: str) -> SumoClient:
    timer = PerfMetrics()
    if access_token == "DUMMY_TOKEN_FOR_TESTING":  # nosec bandit B105
        sumo_client = SumoClient(env=config.SUMO_ENV, interactive=False)
    else:
        sumo_client = FastSumoClient(env=config.SUMO_ENV, access_token=access_token)
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

from typing import TypeVar, Type

from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects._search_context import SearchContext

from primary.services.service_exceptions import (
    Service,
    NoDataError,
)
from ._helpers import create_sumo_client


T = TypeVar("T", bound="SumoCaseAccess")


class SumoCaseAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._case_context: SearchContext

    @classmethod
    def from_case_uuid(cls: Type[T], access_token: str, case_uuid: str) -> T:
        sumo_client: SumoClient = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid)

    async def get_case_context(self) -> SearchContext:
        """
        Get the case context, creating it if necessary.

        Returns:
            SearchContext: The context for the current case

        Raises:
            NoDataError: If unable to create or retrieve case context
        """
        if not self._case_context:
            try:
                search_context = SearchContext(sumo=self._sumo_client)
                # self._case_context = await search_context.get_case_by_uuid_async(self._case_uuid)
                self._case_context = search_context.filter(uuid=self._case_uuid)
            except Exception as e:
                raise NoDataError(f"Unable to get case context for case {self._case_uuid}", Service.SUMO) from e

        return self._case_context

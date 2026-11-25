import logging

import polars as pl
from fmu.datamodels.standard_results.enums import StandardResultName
from fmu.datamodels.standard_results.simulator_fipregions_mapping import SimulatorFipregionsMappingResult
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from pydantic import ValidationError

from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class FipRegionsMappingAccess:
    """
    Class for accessing and retrieving simulator_fipregions_mapping from Sumo.
    """

    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "FipRegionsMappingAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_fip_regions_mapping_async(self) -> SimulatorFipregionsMappingResult | None:
        """Get validated simulator_fipregions_mapping for the ensemble, or None if missing/invalid."""
        sc = SearchContext(self._sumo_client).filter(
            uuid=self._case_uuid,
            ensemble=self._ensemble_name,
            realization=True,
            standard_result=StandardResultName.simulator_fipregions_mapping.value,
        )
        length = await sc.length_async()
        if length == 0:
            return None

        # There will be fip num mappings per realization. For now we assume that the mapping is the same
        # across realizations, since it is created deterministically from zone/region combinations.
        document = await sc.getitem_async(0)
        table = await document.to_arrow_async()
        raw_data = table.to_pylist()

        try:
            return SimulatorFipregionsMappingResult.model_validate(raw_data)
        except ValidationError as error:
            LOGGER.warning(
                "Failed to validate fipRegionsMapping for case_uuid=%s ensemble_name=%s: %s",
                self._case_uuid,
                self._ensemble_name,
                error,
            )
            return None

    async def get_fip_regions_mapping_df_async(self) -> pl.DataFrame | None:
        """Get simulator_fipregions_mapping as a Polars DataFrame with columns (FIPNUM, ZONE, REGION)."""
        mapping = await self.get_fip_regions_mapping_async()
        if mapping is None:
            return None

        return pl.DataFrame(
            {
                "FIPNUM": [row.FIPNUM for row in mapping.root],
                "ZONE": [row.ZONE for row in mapping.root],
                "REGION": [row.REGION for row in mapping.root],
            },
            schema={"FIPNUM": pl.Int64, "ZONE": pl.String, "REGION": pl.String},
        )

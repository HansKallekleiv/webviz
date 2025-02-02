from typing import List, Optional

import pyarrow as pa


from primary.services.sumo_access.sumo_ensemble_access import SumoEnsembleAccess
from ..service_exceptions import Service, InvalidDataError

# Index column values to ignore, i.e. remove from the volumetric tables
IGNORED_IDENTIFIER_COLUMN_VALUES = ["Totals"]

# Allowed raw volumetric columns - from FMU Standard:
# Ref: https://github.com/equinor/fmu-dataio/blob/66e9683de5943d1b982c14ac926cf13007fc2bad/src/fmu/dataio/export/rms/volumetrics.py#L25-L47
ALLOWED_RAW_VOLUMETRIC_COLUMNS = [
    "REAL",
    "ZONE",
    "REGION",
    "LICENSE",
    "FACIES",
    "BULK_OIL",
    "NET_OIL",
    "PORV_OIL",
    "HCPV_OIL",
    "STOIIP_OIL",
    "ASSOCIATEDGAS_OIL",
    "BULK_GAS",
    "NET_GAS",
    "PORV_GAS",
    "HCPV_GAS",
    "GIIP_GAS",
    "ASSOCIATEDOIL_GAS",
    "BULK_TOTAL",
    "NET_TOTAL",
    "PORV_TOTAL",
]

POSSIBLE_IDENTIFIER_COLUMNS = ["ZONE", "REGION", "FACIES", "LICENSE"]


class InplaceVolumetricsAccess(SumoEnsembleAccess):
    @staticmethod
    def get_possible_identifier_columns() -> List[str]:
        return POSSIBLE_IDENTIFIER_COLUMNS

    @staticmethod
    def get_possible_selector_columns() -> List[str]:
        """
        The identifier columns and REAL column represent the selector columns of the volumetric table.
        """
        return InplaceVolumetricsAccess.get_possible_identifier_columns() + ["REAL"]

    async def get_inplace_volumetrics_table_names_async(self) -> List[str]:
        ensemble_context = await self.get_ensemble_context()
        table_context = ensemble_context.tables.filter(content="volumes")
        table_names = await table_context.names_async
        return table_names

    async def get_inplace_volumetrics_table_async(
        self, table_name: str, column_names: Optional[set[str]] = None
    ) -> pa.Table:
        """
        Get inplace volumetrics data for list of columns for given case and iteration as a pyarrow table.

        The volumes are fetched from collection in Sumo and put together in a single table, i.e. a column per response.

        Returns:
        pa.Table with columns: ZONE, REGION, FACIES, REAL, and the requested column names.
        """

        ensemble_context = await self.get_ensemble_context()
        table_context = ensemble_context.tables.filter(
            name=table_name,
            content="volumes",
            column=column_names if column_names is None else list(column_names),
        )

        available_column_names = await table_context.columns_async
        available_response_names = [
            col for col in available_column_names if col not in self.get_possible_selector_columns()
        ]
        if column_names is not None and not column_names.issubset(set(available_response_names)):
            raise InvalidDataError(
                f"Missing requested columns: {column_names}, in the volumetric table {self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        requested_columns = available_response_names if column_names is None else list(column_names)

        # Assemble tables into a single table
        vol_table: pa.Table = await self.load_aggregated_arrow_table_multiple_columns_from_sumo(
            table_column_names=requested_columns, table_content_name="volumes", table_name=table_name
        )

        return vol_table

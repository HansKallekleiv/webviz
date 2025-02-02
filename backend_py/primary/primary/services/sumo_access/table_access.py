from typing import List

import pyarrow as pa

from primary.services.sumo_access.sumo_ensemble_access import SumoEnsembleAccess
from primary.services.service_exceptions import (
    Service,
    MultipleDataMatchesError,
    NoDataError,
)

from .generic_types import SumoTableSchema


class TableAccess(SumoEnsembleAccess):
    """Generic access to Sumo tables"""

    async def get_table_schemas_single_realization_async(self, realization: int = 0) -> List[SumoTableSchema]:
        """Get all table descriptions for a given realization"""

        ensemble_context = await self.get_ensemble_context()
        table_context = ensemble_context.tables.filter(
            realization=realization,
        )
        return [
            SumoTableSchema(
                name=table.name,
                tagname=table.tagname,
                column_names=table.metadata.get("data", {}).get("spec", {}).get("columns", []),
            )
            async for table in table_context
        ]

    async def get_realization_table_async(
        self,
        table_schema: SumoTableSchema,
        realization: int = 0,
    ) -> pa.Table:
        """Get a pyarrow table for a given realization"""
        ensemble_context = await self.get_ensemble_context()
        table_context = ensemble_context.tables.filter(
            realization=realization,
            name=table_schema.name,
            tagname=table_schema.tagname,
        )
        table_count = await table_context.length_async()
        if table_count == 0:
            raise NoDataError(f"No table found for {table_schema=}", Service.SUMO)
        if table_count > 1:
            raise MultipleDataMatchesError(f"Multiple tables found for {table_schema=}", Service.SUMO)

        sumo_table = await table_context.getitem_async(0)
        return await sumo_table.to_arrow_async()

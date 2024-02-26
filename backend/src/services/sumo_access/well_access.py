import logging
from enum import Enum
from io import BytesIO
from typing import List, Optional, Sequence, Union

from concurrent.futures import ThreadPoolExecutor
import pandas as pd

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import TableCollection
from pydantic import ConfigDict, BaseModel

from ._helpers import SumoEnsemble
from .generic_types import EnsembleScalarResponse

# from fmu.sumo.explorer.objects.table import AggregatedTable


LOGGER = logging.getLogger(__name__)


class BlockedWellLog(BaseModel):
    well_name:str
    well_log_name: str
    values: List[Union[str, int, float]]
class WellAccess(SumoEnsemble):
    async def get_blocked_well_log_names(self) -> List[str]:
        """Retrieve the available volumetric tables names and corresponding metadata for the case"""
        table_collection: TableCollection = self._case.tables.filter(
             tagname="bw_pem_qc", iteration=self._iteration_name
        )

        well_names = await table_collection.names_async
        return well_names
    
    async def get_blocked_well_logs(self, well_name: str) -> List[BlockedWellLog]:
        """Retrieve the available volumetric tables names and corresponding metadata for the case"""
        table_collection: TableCollection = self._case.tables.filter(
             tagname="bw_pem_qc", iteration=self._iteration_name, name=well_name
        )
        count = await table_collection.length_async()

        if count != 1:
            return []
        # byte_stream: BytesIO = table_collection[0].blob
        # table: pa.Table = pq.read_table(byte_stream)
        df = table_collection[0].to_pandas

        df = df.drop(columns=["WELLNAME"])

        df = df.drop(columns=["X_UTME", "Y_UTMN", "I_INDEX", "J_INDEX", "K_INDEX"])
        return [BlockedWellLog(well_name=well_name, well_log_name=col, values=df[col].tolist()) for col in df.columns]
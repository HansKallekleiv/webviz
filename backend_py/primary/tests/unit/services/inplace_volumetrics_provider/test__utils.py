from primary.services.inplace_volumetrics_provider._utils import get_valid_result_names_from_list
from primary.services.inplace_volumetrics_provider._utils import create_per_realization_accumulated_result_table
from primary.services.inplace_volumetrics_provider._utils import create_statistical_grouped_result_table_data_pandas
from primary.services.sumo_access.inplace_volumetrics_types import (
    FluidZone,
    InplaceVolumetricTableData,
    InplaceVolumetricsIdentifier,
    InplaceVolumetricResultName,
    RepeatedTableColumnData,
    Statistic,
    TableColumnData,
    TableColumnStatisticalData,
)

import pyarrow as pa
import numpy as np


def test_get_valid_result_names_from_list() -> None:
    result_names = ["BULK", "NET", "PORO", "LICENSE", "GRID"]
    valid_result_names = get_valid_result_names_from_list(result_names)
    assert valid_result_names == ["BULK", "NET", "PORO"]


def test_create_per_realization_accumulated_result_table() -> None:
    input_table = pa.Table.from_pydict(
        {
            "ZONE": ["Z1", "Z1", "Z1", "Z1", "Z2", "Z2", "Z2", "Z2"],
            "REGION": ["R1", "R1", "R2", "R2", "R1", "R1", "R2", "R2"],
            "FACIES": ["F1", "F2", "F3", "F4", "F1", "F2", "F3", "F4"],
            "LICENSE": ["L1", "L2", "L3", "L4", "L1", "L2", "L3", "L4"],
            "REAL": [0, 0, 0, 0, 1, 1, 1, 1],
            "BULK": [1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0],
            "NET": [2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0],
            "PORO": [3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0],
        },
    )
    selector_columns = ["ZONE", "REGION", "FACIES", "LICENSE", "REAL"]

    group_by_identifiers = []
    result_table = create_per_realization_accumulated_result_table(input_table, selector_columns, group_by_identifiers)
    assert set(result_table.column_names) == set(["REAL", "BULK", "NET", "PORO"])
    assert result_table.to_pydict() == {"REAL": [0, 1], "BULK": [4.0, 8.0], "NET": [8.0, 12.0], "PORO": [12.0, 16.0]}

    group_by_identifiers = [InplaceVolumetricsIdentifier.ZONE, InplaceVolumetricsIdentifier.REGION]
    result_table = create_per_realization_accumulated_result_table(input_table, selector_columns, group_by_identifiers)
    assert set(result_table.column_names) == set(["REAL", "ZONE", "REGION", "BULK", "NET", "PORO"])
    assert result_table.to_pydict() == {
        "REAL": [0, 0, 1, 1],
        "ZONE": ["Z1", "Z1", "Z2", "Z2"],
        "REGION": ["R1", "R2", "R1", "R2"],
        "BULK": [2.0, 2.0, 4.0, 4.0],
        "NET": [4.0, 4.0, 6.0, 6.0],
        "PORO": [6.0, 6.0, 8.0, 8.0],
    }


def test_create_statistical_grouped_result_table_data_pandas() -> None:
    input_table = pa.Table.from_pydict(
        {
            "ZONE": ["Z1", "Z1", "Z1", "Z1", "Z2", "Z2", "Z2", "Z2"],
            "REGION": ["R1", "R1", "R2", "R2", "R1", "R1", "R2", "R2"],
            "FACIES": ["F1", "F2", "F3", "F4", "F1", "F2", "F3", "F4"],
            "LICENSE": ["L1", "L2", "L3", "L4", "L1", "L2", "L3", "L4"],
            "REAL": [0, 0, 0, 0, 1, 1, 1, 1],
            "BULK": [1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0],
            "NET": [2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0],
            "PORO": [3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0],
        },
    )
    selector_columns = ["ZONE", "REGION", "FACIES", "LICENSE", "REAL"]
    group_by_identifiers = [InplaceVolumetricsIdentifier.ZONE, InplaceVolumetricsIdentifier.REGION]
    selector_columns_data_list, result_statistical_data_list = create_statistical_grouped_result_table_data_pandas(
        input_table, selector_columns, group_by_identifiers
    )
    assert len(selector_columns_data_list) == 2
    assert (
        RepeatedTableColumnData(column_name="REGION", unique_values=["R1", "R2"], indices=[0, 0, 1, 1])
        in selector_columns_data_list
    )
    assert (
        RepeatedTableColumnData(column_name="ZONE", unique_values=["Z1", "Z2"], indices=[0, 1, 0, 1])
        in selector_columns_data_list
    )

    # assert [
    #     TableColumnStatisticalData(
    #         column_name="BULK",
    #         statistic_values={
    #             "mean": [2.0, 4.0, 2.0, 4.0],
    #             "stddev": [0.0, 0.0, 0.0, 0.0],
    #             "min": [2.0, 4.0, 2.0, 4.0],
    #             "max": [2.0, 4.0, 2.0, 4.0],
    #             "p10": [2.0, 4.0, 2.0, 4.0],
    #             "p90": [2.0, 4.0, 2.0, 4.0],
    #         },
    #     )
    # ] in result_statistical_data_list


# def test_monotonically_increasing_date_util_functions() -> None:
#     table_with_duplicate = pa.Table.from_pydict(
#         {
#             "DATE": [
#                 np.datetime64("2020-01-01", "ms"),
#                 np.datetime64("2020-01-02", "ms"),
#                 np.datetime64("2020-01-02", "ms"),
#                 np.datetime64("2020-01-03", "ms"),
#                 np.datetime64("2020-01-04", "ms"),
#                 np.datetime64("2020-01-04", "ms"),
#             ],
#         },
#     )

#     table_with_decrease = pa.Table.from_pydict(
#         {
#             "DATE": [
#                 np.datetime64("2020-01-01", "ms"),
#                 np.datetime64("2020-01-05", "ms"),
#                 np.datetime64("2020-01-04", "ms"),
#                 np.datetime64("2020-01-10", "ms"),
#                 np.datetime64("2020-01-15", "ms"),
#                 np.datetime64("2020-01-14", "ms"),
#             ],
#         },
#     )

#     assert not is_date_column_monotonically_increasing(table_with_duplicate)
#     offending_pair = find_first_non_increasing_date_pair(table_with_duplicate)
#     assert offending_pair[0] == np.datetime64("2020-01-02", "ms")
#     assert offending_pair[1] == np.datetime64("2020-01-02", "ms")

#     assert not is_date_column_monotonically_increasing(table_with_decrease)
#     offending_pair = find_first_non_increasing_date_pair(table_with_decrease)
#     assert offending_pair[0] == np.datetime64("2020-01-05", "ms")
#     assert offending_pair[1] == np.datetime64("2020-01-04", "ms")

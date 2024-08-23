import pytest

from primary.services.inplace_volumetrics_provider._utils import get_valid_result_names_from_list
from primary.services.inplace_volumetrics_provider._utils import create_per_realization_accumulated_result_table
from primary.services.inplace_volumetrics_provider._utils import create_statistical_grouped_result_table_data_pyarrow
from primary.services.inplace_volumetrics_provider._utils import create_inplace_volumetric_table_data_from_result_table
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


# Test data
@pytest.fixture
def input_table():
    return pa.Table.from_pydict(
        {
            "ZONE": ["Z1", "Z1", "Z2", "Z2", "Z1", "Z1", "Z2", "Z2"],
            "REGION": ["R1", "R2", "R1", "R2", "R1", "R2", "R1", "R2"],
            "REAL": [0, 0, 0, 0, 1, 1, 1, 1],
            "BULK": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
            "NET": [1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1],
            "PORO": [1.11, 2.11, 3.11, 4.11, 5.11, 6.11, 7.11, 8.11],
        }
    )


def test_get_valid_result_names_from_list() -> None:
    result_names = ["BULK", "NET", "PORO", "LICENSE", "GRID"]
    valid_result_names = get_valid_result_names_from_list(result_names)
    assert valid_result_names == ["BULK", "NET", "PORO"]


@pytest.mark.parametrize(
    "group_by_identifiers, expected_columns, expected_result",
    [
        (
            [],
            ["REAL", "BULK", "NET", "PORO"],
            {"REAL": [0, 1], "BULK": [10.0, 26.0], "NET": [10.4, 26.4], "PORO": [10.44, 26.44]},
        ),
        (
            [InplaceVolumetricsIdentifier.ZONE],
            ["REAL", "ZONE", "BULK", "NET", "PORO"],
            {
                "ZONE": ["Z1", "Z2", "Z1", "Z2"],
                "REAL": [0, 0, 1, 1],
                "BULK": [3.0, 7.0, 11.0, 15.0],
                "NET": [3.2, 7.2, 11.2, 15.2],
                "PORO": [3.22, 7.22, 11.22, 15.22],
            },
        ),
        (
            [InplaceVolumetricsIdentifier.ZONE, InplaceVolumetricsIdentifier.REGION],
            ["REAL", "ZONE", "REGION", "BULK", "NET", "PORO"],
            {
                "ZONE": ["Z1", "Z1", "Z2", "Z2", "Z1", "Z1", "Z2", "Z2"],
                "REAL": [0, 0, 0, 0, 1, 1, 1, 1],
                "REGION": ["R1", "R2", "R1", "R2", "R1", "R2", "R1", "R2"],
                "BULK": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
                "NET": [1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1],
                "PORO": [1.11, 2.11, 3.11, 4.11, 5.11, 6.11, 7.11, 8.11],
            },
        ),
    ],
)
def test_create_per_realization_accumulated_result_table(
    input_table, group_by_identifiers, expected_columns, expected_result
):
    selector_columns = ["ZONE", "REGION", "REAL"]
    result_table = create_per_realization_accumulated_result_table(input_table, selector_columns, group_by_identifiers)

    # Check column names
    assert set(result_table.column_names) == set(expected_columns)

    # Check result data
    result_dict = result_table.to_pydict()

    for key, value in expected_result.items():
        assert result_dict[key] == pytest.approx(value)


def test_create_per_realization_accumulated_result_table_empty_input(input_table):
    empty_table = pa.Table.from_pydict({col: [] for col in input_table.column_names})
    selector_columns = ["ZONE", "REGION", "FACIES", "LICENSE", "REAL"]
    group_by_identifiers = [InplaceVolumetricsIdentifier.ZONE, InplaceVolumetricsIdentifier.REGION]

    result_table = create_per_realization_accumulated_result_table(empty_table, selector_columns, group_by_identifiers)

    assert set(result_table.column_names) == set(["REAL", "ZONE", "REGION", "BULK", "NET", "PORO"])
    assert all(len(col) == 0 for col in result_table.to_pydict().values())


@pytest.mark.parametrize(
    "group_by_identifiers, expected_groups, expected_stats",
    [
        (
            [InplaceVolumetricsIdentifier.ZONE, InplaceVolumetricsIdentifier.REGION],
            4,
            {
                "BULK": {
                    "mean": [3.0, 4.0, 5.0, 6.0],
                    "std": [2.0, 2.0, 2.0, 2.0],
                    "min": [1.0, 2.0, 3.0, 4.0],
                    "max": [5.0, 6.0, 7.0, 8.0],
                    "p10": [1.0, 2.0, 3.0, 4.0],
                    "p90": [5.0, 6.0, 7.0, 8.0],
                },
                "NET": {
                    "mean": [3.1, 4.1, 5.1, 6.1],
                    "std": [2.0, 2.0, 2.0, 2.0],
                    "min": [1.1, 2.1, 3.1, 4.1],
                    "max": [5.1, 6.1, 7.1, 8.1],
                    "p10": [1.1, 2.1, 3.1, 4.1],
                    "p90": [5.1, 6.1, 7.1, 8.1],
                },
                "PORO": {
                    "mean": [3.11, 4.11, 5.11, 6.11],
                    "std": [2.0, 2.0, 2.0, 2.0],
                    "min": [1.11, 2.11, 3.11, 4.11],
                    "max": [5.11, 6.11, 7.11, 8.11],
                    "p10": [1.11, 2.11, 3.11, 4.11],
                    "p90": [5.11, 6.11, 7.11, 8.11],
                },
                "BULK": {
                    "mean": [3.0, 4.0, 5.0, 6.0],
                    "std": [2.0, 2.0, 2.0, 2.0],
                    "min": [1.0, 2.0, 3.0, 4.0],
                    "max": [5.0, 6.0, 7.0, 8.0],
                    "p10": [1.0, 2.0, 3.0, 4.0],
                    "p90": [5.0, 6.0, 7.0, 8.0],
                },
            },
        ),
        (
            [InplaceVolumetricsIdentifier.ZONE],
            2,
            {
                "BULK": {
                    "mean": [7.0, 11.0],
                    "std": [4.0, 4.0],
                    "min": [3.0, 7.0],
                    "max": [11.0, 15.0],
                    "p10": [3.0, 7.0],
                    "p90": [11.0, 15.0],
                },
                "NET": {
                    "mean": [7.2, 11.2],
                    "std": [4.0, 4.0],
                    "min": [3.2, 7.2],
                    "max": [11.2, 15.2],
                    "p10": [3.2, 7.2],
                    "p90": [11.2, 15.2],
                },
                "PORO": {
                    "mean": [7.22, 11.22],
                    "std": [4.0, 4.0],
                    "min": [3.22, 7.22],
                    "max": [11.22, 15.22],
                    "p10": [3.22, 7.22],
                    "p90": [11.22, 15.22],
                },
                "BULK": {
                    "mean": [7.0, 11.0],
                    "std": [4.0, 4.0],
                    "min": [3.0, 7.0],
                    "max": [11.0, 15.0],
                    "p10": [3.0, 7.0],
                    "p90": [11.0, 15.0],
                },
            },
        ),
    ],
)
def test_create_statistical_grouped_result_table_data_pyarrow2(
    input_table, group_by_identifiers, expected_groups, expected_stats
):
    selector_columns = ["ZONE", "REGION", "FACIES", "LICENSE", "REAL"]
    selector_columns_data_list, result_statistical_data_list = create_statistical_grouped_result_table_data_pyarrow(
        input_table, selector_columns, group_by_identifiers
    )
    from dataclasses import asdict

    for d in result_statistical_data_list:
        print(asdict(d))

    # Test selector columns
    assert len(selector_columns_data_list) == len(group_by_identifiers)
    for col in group_by_identifiers:
        assert any(data.column_name == col.value for data in selector_columns_data_list)

    # Test that all selector columns are present
    all_column_names = [data.column_name for data in selector_columns_data_list]
    assert set(all_column_names) == set(col.value for col in group_by_identifiers)

    # Test statistical data
    assert len(result_statistical_data_list) == 3  # BULK, NET, PORO
    statistical_columns = ["BULK", "NET", "PORO"]
    for col in statistical_columns:
        assert any(data.column_name == col for data in result_statistical_data_list)

    # Check that the number of groups is correct
    for data in result_statistical_data_list:
        assert len(data.statistic_values[Statistic.MEAN]) == expected_groups

    # Test statistical calculations
    for stat_data in result_statistical_data_list:
        column = stat_data.column_name
        print(stat_data.__dict__)
        for stat, values in stat_data.statistic_values.items():

            if stat == Statistic.MEAN:
                np.testing.assert_allclose(values, expected_stats[column]["mean"], rtol=1e-5)
            elif stat == Statistic.MIN:
                np.testing.assert_allclose(values, expected_stats[column]["min"], rtol=1e-5)
            elif stat == Statistic.MAX:
                np.testing.assert_allclose(values, expected_stats[column]["max"], rtol=1e-5)
            elif stat == Statistic.STD_DEV:
                np.testing.assert_allclose(values, expected_stats[column]["std"], rtol=1e-5)

    # Test that the number of statistical values matches the number of groups
    for stat_data in result_statistical_data_list:
        for values in stat_data.statistic_values.values():
            assert len(values) == expected_groups


# # @pytest.mark.parametrize(
# #     "group_by_identifiers, expected_columns, expected_result",
# #     [
# #         (
# #             ["FOO"],
# #             ["REAL", "BULK", "NET", "PORO"],
# #             {"REAL": [0, 1], "BULK": [6.0, 14.0], "NET": [12.0, 20.0], "PORO": [16.0, 24.0]},
# #         ),
# #         (
# #             [InplaceVolumetricsIdentifier.ZONE, InplaceVolumetricsIdentifier.REGION],
# #             ["REAL", "ZONE", "REGION", "BULK", "NET", "PORO"],
# #             {
# #                 "REAL": [0, 0, 1, 1],
# #                 "ZONE": ["Z1", "Z1", "Z2", "Z2"],
# #                 "REGION": ["R1", "R2", "R1", "R2"],
# #                 "BULK": [3.0, 3.0, 7.0, 7.0],
# #                 "NET": [6.0, 6.0, 10.0, 10.0],
# #                 "PORO": [8.0, 8.0, 12.0, 12.0],
# #             },
# #         ),
# #     ],
# # )
# # def test_create_inplace_volumetric_table_data_from_result_table(
# #     input_table, group_by_identifiers, expected_columns, expected_result
# # ) -> None:
# #     result_table = create_per_realization_accumulated_result_table(
# #         input_table, ["ZONE", "REGION", "FACIES", "LICENSE", "REAL"], group_by_identifiers
# #     )
# #     selector_columns = ["ZONE", "REGION", "FACIES", "LICENSE", "REAL"]
# #     result_statistical_data_list = create_statistical_grouped_result_table_data_pyarrow(
# #         result_table, selector_columns, group_by_identifiers
# #     )[1]

# #     inplace_volumetric_table_data = create_inplace_volumetric_table_data_from_result_table(result_statistical_data_list)

# #     # Check column names
# #     assert set(inplace_volumetric_table_data.column_names) == set(expected_columns)

# #     # Check result data
# #     result_dict = inplace_volumetric_table_data.to_pydict()
# #     for key, value in expected_result.items():
# #         assert result_dict[key] == pytest.approx(value)

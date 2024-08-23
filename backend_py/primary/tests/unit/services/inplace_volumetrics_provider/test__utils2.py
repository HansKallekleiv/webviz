import pytest
import numpy as np
from primary.services.inplace_volumetrics_provider._utils import create_statistical_grouped_result_table_data_pyarrow
from primary.services.inplace_volumetrics_provider._utils import InplaceVolumetricsIdentifier
from primary.services.inplace_volumetrics_provider._utils import Statistic
@pytest.mark.parametrize(
    "group_by_identifiers, expected_groups, expected_stats",
    [
        (
            [],
            0,
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
        )
    ],
)
def test_create_statistical_grouped_result_table_data_pyarrow2(
    inplace_raw_arrow_table, group_by_identifiers, expected_groups, expected_stats
):
    selector_columns = ["ZONE", "REGION", "FACIES", "LICENSE", "REAL"]
    selector_columns_data_list, result_statistical_data_list = create_statistical_grouped_result_table_data_pyarrow(
        inplace_raw_arrow_table, selector_columns, group_by_identifiers
    )

    # Test selector columns
    assert len(selector_columns_data_list) == len(group_by_identifiers)
    for col in group_by_identifiers:
        assert any(data.column_name == col.value for data in selector_columns_data_list)

    # Test that all selector columns are present
    all_column_names = [data.column_name for data in selector_columns_data_list]
    assert set(all_column_names) == set(col.value for col in group_by_identifiers)

    # Test statistical data
    assert len(result_statistical_data_list) == 10  # BULK, NET, PORO
    print(result_statistical_data_list)
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

from datetime import date

import polars as pl
import pytest

from webviz_services.inplace_volumes_table_assembler._utils.simulator_volumes_df_utils import (
    filter_to_earliest_date,
    join_fip_mapping_to_simulator_volumes_df,
    validate_and_normalize_fip_mapping_df,
)
from webviz_services.service_exceptions import InvalidDataError


def test_filter_to_earliest_date_single_date() -> None:
    df = pl.DataFrame(
        {
            "REAL": [0, 0, 1, 1],
            "DATE": [date(2020, 1, 1)] * 4,
            "FIPNUM": [1, 2, 1, 2],
            "FLUID": ["oil", "gas", "oil", "gas"],
            "STOIIP": [100.0, 0.0, 110.0, 0.0],
        }
    )

    result = filter_to_earliest_date(df, "simgrid")
    assert not result.has_warnings()
    out = result.get_value()
    assert "DATE" not in out.columns
    assert out.height == 4


def test_filter_to_earliest_date_multiple_dates_per_realization() -> None:
    df = pl.DataFrame(
        {
            "REAL": [0, 0, 1, 1],
            "DATE": [date(2020, 1, 1), date(2021, 1, 1), date(2020, 1, 1), date(2022, 1, 1)],
            "FIPNUM": [1, 1, 1, 1],
            "FLUID": ["oil", "oil", "oil", "oil"],
            "STOIIP": [100.0, 80.0, 120.0, 90.0],
        }
    )

    result = filter_to_earliest_date(df, "simgrid")
    assert not result.has_warnings()
    out = result.get_value().sort("REAL")
    assert "DATE" not in out.columns
    assert out["STOIIP"].to_list() == [100.0, 120.0]


def test_filter_to_earliest_date_without_real_column() -> None:
    df = pl.DataFrame(
        {
            "DATE": [date(2020, 1, 1), date(2021, 1, 1)],
            "FIPNUM": [1, 1],
            "FLUID": ["oil", "oil"],
            "STOIIP": [100.0, 80.0],
        }
    )

    result = filter_to_earliest_date(df, "simgrid")
    assert not result.has_warnings()
    out = result.get_value()
    assert "DATE" not in out.columns
    assert out["STOIIP"].to_list() == [100.0]


def test_filter_to_earliest_date_differing_earliest_dates_emits_warning() -> None:
    df = pl.DataFrame(
        {
            "REAL": [0, 0, 1, 1],
            "DATE": [date(2020, 1, 1), date(2021, 1, 1), date(2020, 6, 1), date(2021, 6, 1)],
            "FIPNUM": [1, 1, 1, 1],
            "FLUID": ["oil", "oil", "oil", "oil"],
            "STOIIP": [100.0, 80.0, 120.0, 90.0],
        }
    )

    result = filter_to_earliest_date(df, "simgrid")
    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "simgrid" in warnings[0].message
    assert "2020-01-01" in warnings[0].message
    assert "2020-06-01" in warnings[0].message

    out = result.get_value().sort("REAL")
    assert "DATE" not in out.columns
    assert out["STOIIP"].to_list() == [100.0, 120.0]


def test_filter_to_earliest_date_empty_df() -> None:
    df = pl.DataFrame(schema={"REAL": pl.Int64, "DATE": pl.Date, "FIPNUM": pl.Int64, "STOIIP": pl.Float64})
    result = filter_to_earliest_date(df, "simgrid")
    assert not result.has_warnings()
    out = result.get_value()
    assert out.is_empty()
    assert "DATE" not in out.columns


def test_filter_to_earliest_date_missing_date_column_raises() -> None:
    df = pl.DataFrame({"REAL": [0], "FIPNUM": [1], "STOIIP": [100.0]})
    with pytest.raises(InvalidDataError, match="DATE column is missing"):
        filter_to_earliest_date(df, "simgrid")


def test_validate_and_normalize_fip_mapping_df_one_to_one() -> None:
    mapping_df = pl.DataFrame(
        {
            "FIPNUM": pl.Series([1, 2], dtype=pl.Int32),
            "ZONE": ["Valysar", "Therys"],
            "REGION": ["North", "South"],
        }
    )

    normalized = validate_and_normalize_fip_mapping_df(mapping_df)
    assert normalized is not None
    assert normalized.schema == {"FIPNUM": pl.Int64, "ZONE": pl.String, "REGION": pl.String}
    assert normalized.height == 2


def test_validate_and_normalize_fip_mapping_df_many_to_one() -> None:
    mapping_df = pl.DataFrame(
        {
            "FIPNUM": [1, 2, 3],
            "ZONE": ["Valysar", "Valysar", "Therys"],
            "REGION": ["North", "North", "South"],
        }
    )

    normalized = validate_and_normalize_fip_mapping_df(mapping_df)
    assert normalized is not None
    assert normalized.height == 3


def test_validate_and_normalize_fip_mapping_df_drops_exact_duplicates() -> None:
    mapping_df = pl.DataFrame(
        {
            "FIPNUM": [1, 1, 2],
            "ZONE": ["Valysar", "Valysar", "Therys"],
            "REGION": ["North", "North", "South"],
        }
    )

    normalized = validate_and_normalize_fip_mapping_df(mapping_df)
    assert normalized is not None
    assert normalized.height == 2


def test_validate_and_normalize_fip_mapping_df_rejects_conflicting_fipnum() -> None:
    mapping_df = pl.DataFrame(
        {
            "FIPNUM": [1, 1],
            "ZONE": ["Valysar", "Therys"],
            "REGION": ["North", "North"],
        }
    )

    assert validate_and_normalize_fip_mapping_df(mapping_df) is None


def test_validate_and_normalize_fip_mapping_df_rejects_empty_and_missing_columns() -> None:
    empty_df = pl.DataFrame(schema={"FIPNUM": pl.Int64, "ZONE": pl.String, "REGION": pl.String})
    assert validate_and_normalize_fip_mapping_df(empty_df) is None

    missing_col_df = pl.DataFrame({"FIPNUM": [1], "ZONE": ["Valysar"]})
    assert validate_and_normalize_fip_mapping_df(missing_col_df) is None


def test_join_fip_mapping_all_mapped_with_dtype_mismatch() -> None:
    sim_df = pl.DataFrame(
        {
            "REAL": [0, 0],
            "FIPNUM": pl.Series([1, 2], dtype=pl.Int32),
            "FLUID": ["oil", "oil"],
            "STOIIP": [100.0, 200.0],
        }
    )
    mapping_df = pl.DataFrame(
        {
            "FIPNUM": pl.Series([1, 2], dtype=pl.Int64),
            "ZONE": ["Valysar", "Therys"],
            "REGION": ["North", "South"],
        }
    )

    result = join_fip_mapping_to_simulator_volumes_df(sim_df, mapping_df, "simgrid")
    assert not result.has_warnings()
    out = result.get_value().sort("STOIIP")
    assert "FIPNUM" not in out.columns
    assert out["ZONE"].to_list() == ["Valysar", "Therys"]
    assert out["REGION"].to_list() == ["North", "South"]
    assert out["STOIIP"].to_list() == [100.0, 200.0]


def test_join_fip_mapping_unmapped_fipnums_dropped_and_warned() -> None:
    sim_df = pl.DataFrame(
        {
            "REAL": [0] * 7,
            "FIPNUM": [1, 10, 11, 12, 13, 14, 15],
            "FLUID": ["oil"] * 7,
            "STOIIP": [100.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
        }
    )
    mapping_df = pl.DataFrame(
        {
            "FIPNUM": [1],
            "ZONE": ["Valysar"],
            "REGION": ["North"],
        }
    )

    result = join_fip_mapping_to_simulator_volumes_df(sim_df, mapping_df, "simgrid")
    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "simgrid" in warnings[0].message
    assert "6 unmapped FIPNUM" in warnings[0].message
    assert "10, 11, 12, 13, 14, ..." in warnings[0].message

    out = result.get_value()
    assert out.height == 1
    assert out["ZONE"].to_list() == ["Valysar"]
    assert out["STOIIP"].to_list() == [100.0]

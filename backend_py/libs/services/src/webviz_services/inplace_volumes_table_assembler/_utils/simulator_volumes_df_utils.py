"""
Pure Polars helper functions for transforming simulator inplace volumes DataFrames
and validating/joining simulator_fipregions_mapping tables.
"""

import polars as pl

from webviz_core_utils.result_with_warning import ResultWithWarning
from webviz_core_utils.text_warning import TextWarning
from webviz_services.service_exceptions import InvalidDataError, Service

_MAX_UNMAPPED_FIPNUMS_IN_WARNING = 5
_REQUIRED_MAPPING_COLUMNS = ("FIPNUM", "ZONE", "REGION")


def make_unmapped_fipnums_warning(table_name: str, unmapped_fipnums: list[int]) -> TextWarning:
    """Create a concise TextWarning describing unmapped FIPNUM values excluded from a simulator table."""
    sorted_ids = sorted(unmapped_fipnums)
    sample = ", ".join(str(fid) for fid in sorted_ids[:_MAX_UNMAPPED_FIPNUMS_IN_WARNING])
    if len(sorted_ids) > _MAX_UNMAPPED_FIPNUMS_IN_WARNING:
        sample += ", ..."
    return TextWarning(
        f"Simulator inplace volumes table '{table_name}' has {len(sorted_ids)} unmapped FIPNUM(s) "
        f"excluded ({sample})."
    )


def filter_to_earliest_date(df: pl.DataFrame, table_name: str) -> ResultWithWarning[pl.DataFrame]:
    """
    Filter a simulator inplace volumes DataFrame to each realization's minimum DATE and drop DATE.

    If REAL is not present (e.g. single-realization metadata inspection), filters to the global minimum DATE.
    If realizations have differing earliest DATE values, emits a concise TextWarning.
    """
    if df.is_empty():
        return ResultWithWarning(df.drop("DATE") if "DATE" in df.columns else df)

    if "DATE" not in df.columns:
        raise InvalidDataError(
            f"DATE column is missing in simulator inplace volumes table '{table_name}'",
            Service.GENERAL,
        )

    warnings: list[TextWarning] = []
    if "REAL" in df.columns:
        filtered_df = df.filter(pl.col("DATE") == pl.col("DATE").min().over("REAL"))
        unique_earliest_dates = filtered_df["DATE"].drop_nulls().unique().sort().to_list()
        if len(unique_earliest_dates) > 1:
            earliest_str = str(unique_earliest_dates[0])
            latest_str = str(unique_earliest_dates[-1])
            warnings.append(
                TextWarning(
                    f"Simulator inplace volumes table '{table_name}' has {len(unique_earliest_dates)} differing "
                    f"earliest DATE values across realizations ({earliest_str} to {latest_str}). "
                    "Using each realization's earliest date."
                )
            )
    else:
        filtered_df = df.filter(pl.col("DATE") == pl.col("DATE").min())

    return ResultWithWarning(filtered_df.drop("DATE"), warnings)


def validate_and_normalize_fip_mapping_df(mapping_df: pl.DataFrame) -> pl.DataFrame | None:
    """
    Validate and normalize a FIPNUM -> (ZONE, REGION) mapping DataFrame.

    - Requires columns FIPNUM, ZONE, REGION.
    - Casts FIPNUM to Int64 and ZONE/REGION to String.
    - Drops exact duplicate (FIPNUM, ZONE, REGION) rows.
    - Returns None if empty, missing required columns, containing nulls, or if any FIPNUM maps to
      more than one (ZONE, REGION) pair (to prevent double-counting volumes).
    """
    if mapping_df.is_empty() or not set(_REQUIRED_MAPPING_COLUMNS).issubset(mapping_df.columns):
        return None

    try:
        normalized = mapping_df.select(
            pl.col("FIPNUM").cast(pl.Int64),
            pl.col("ZONE").cast(pl.String),
            pl.col("REGION").cast(pl.String),
        )
    except pl.exceptions.PolarsError:
        return None

    if normalized.null_count().select(pl.sum_horizontal(pl.all())).item() > 0:
        return None

    normalized = normalized.unique(subset=list(_REQUIRED_MAPPING_COLUMNS), maintain_order=True)

    # After dropping exact duplicates, any remaining duplicate FIPNUM maps to conflicting (ZONE, REGION) pairs.
    if normalized.is_empty() or normalized["FIPNUM"].n_unique() < normalized.height:
        return None

    return normalized


def normalize_fipnum_series(series: pl.Series) -> pl.Series:
    """
    Normalize a FIPNUM Series to Int64, converting non-integer, non-finite, or unparseable values to null.

    Accepts integer dtypes, integral floats (e.g. 1.0), and numeric strings (e.g. "1", "1.0").
    Non-integral floats (e.g. 1.5), NaN/inf, empty strings, and non-numeric strings become null.
    """
    if series.dtype.is_integer():
        return series.cast(pl.Int64)

    as_float = series.cast(pl.Float64, strict=False)
    is_valid_int = as_float.is_finite() & (as_float == as_float.floor())
    return pl.DataFrame({"f": as_float, "valid": is_valid_int}).select(
        pl.when(pl.col("valid")).then(pl.col("f").cast(pl.Int64, strict=False)).otherwise(None).alias(series.name)
    )[series.name]


def join_fip_mapping_to_simulator_volumes_df(
    sim_df: pl.DataFrame, mapping_df: pl.DataFrame, table_name: str
) -> ResultWithWarning[pl.DataFrame]:
    """
    Join a validated FIPNUM -> (ZONE, REGION) mapping onto a simulator inplace volumes DataFrame.

    - Normalizes FIPNUM to Int64 leniently on sim_df, dropping rows with invalid/missing FIPNUM with a warning.
    - Detects any FIPNUM values in sim_df missing from mapping_df, emits a concise TextWarning, and
      drops unmapped rows via inner join.
    - Attaches ZONE and REGION and drops FIPNUM.
    """
    if "FIPNUM" not in sim_df.columns:
        raise InvalidDataError(
            f"FIPNUM column is missing in simulator inplace volumes table '{table_name}'",
            Service.GENERAL,
        )

    warnings: list[TextWarning] = []
    normalized_fipnum = normalize_fipnum_series(sim_df["FIPNUM"])
    num_invalid_fipnum_rows = int(normalized_fipnum.null_count())
    if num_invalid_fipnum_rows > 0:
        warnings.append(
            TextWarning(
                f"Simulator inplace volumes table '{table_name}' had {num_invalid_fipnum_rows} row(s) "
                "with invalid or missing FIPNUM values that were excluded."
            )
        )

    sim_cast = sim_df.with_columns(normalized_fipnum.alias("FIPNUM")).filter(pl.col("FIPNUM").is_not_null())
    mapping_cast = mapping_df.select(
        pl.col("FIPNUM").cast(pl.Int64),
        pl.col("ZONE").cast(pl.String),
        pl.col("REGION").cast(pl.String),
    )

    sim_fipnums = set(sim_cast["FIPNUM"].unique().to_list())
    mapped_fipnums = set(mapping_cast["FIPNUM"].drop_nulls().unique().to_list())
    unmapped_fipnums = sorted(sim_fipnums - mapped_fipnums)

    if unmapped_fipnums:
        warnings.append(make_unmapped_fipnums_warning(table_name, unmapped_fipnums))

    joined_df = sim_cast.join(mapping_cast, on="FIPNUM", how="inner").drop("FIPNUM")
    return ResultWithWarning(joined_df, warnings)

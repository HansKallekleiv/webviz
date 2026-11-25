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


def join_fip_mapping_to_simulator_volumes_df(
    sim_df: pl.DataFrame, mapping_df: pl.DataFrame, table_name: str
) -> ResultWithWarning[pl.DataFrame]:
    """
    Join a validated FIPNUM -> (ZONE, REGION) mapping onto a simulator inplace volumes DataFrame.

    - Casts FIPNUM to Int64 on both sides before joining.
    - Detects any FIPNUM values in sim_df missing from mapping_df, emits a concise TextWarning, and
      drops unmapped rows via inner join.
    - Attaches ZONE and REGION and drops FIPNUM.
    """
    if "FIPNUM" not in sim_df.columns:
        raise InvalidDataError(
            f"FIPNUM column is missing in simulator inplace volumes table '{table_name}'",
            Service.GENERAL,
        )

    sim_cast = sim_df.with_columns(pl.col("FIPNUM").cast(pl.Int64))
    mapping_cast = mapping_df.select(
        pl.col("FIPNUM").cast(pl.Int64),
        pl.col("ZONE").cast(pl.String),
        pl.col("REGION").cast(pl.String),
    )

    sim_fipnums = set(sim_cast["FIPNUM"].drop_nulls().unique().to_list())
    mapped_fipnums = set(mapping_cast["FIPNUM"].drop_nulls().unique().to_list())
    unmapped_fipnums = sorted(sim_fipnums - mapped_fipnums)

    warnings: list[TextWarning] = []
    if unmapped_fipnums:
        warnings.append(make_unmapped_fipnums_warning(table_name, unmapped_fipnums))

    joined_df = sim_cast.join(mapping_cast, on="FIPNUM", how="inner").drop("FIPNUM")
    return ResultWithWarning(joined_df, warnings)

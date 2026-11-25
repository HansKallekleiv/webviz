from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import polars as pl
import pyarrow as pa
import pytest

from webviz_services.inplace_volumes_table_assembler.inplace_volumes_table_assembler import (
    InplaceVolumesTableAssembler,
)
from webviz_services.service_exceptions import InvalidDataError, Service, ServiceTimeoutError
from webviz_services.sumo_access.simulator_inplace_volumes_table_access import SimulatorInplaceVolumesTableAccess
from webviz_services.sumo_access.inplace_volumes_table_types import (
    InplaceVolumes,
    InplaceVolumesIndexWithValues,
    InplaceVolumesTableSource,
    Statistic,
    VolumeColumnsAndIndexUniqueValues,
)


def _make_static_access_mock(table_names: list[str] | None = None) -> AsyncMock:
    mock = AsyncMock()
    mock.get_inplace_volumes_table_names_async.return_value = table_names or []
    mock.get_volume_columns_and_index_unique_values_async.return_value = VolumeColumnsAndIndexUniqueValues(
        volume_columns=["BULK", "NET", "PORV", "HCPV", "STOIIP"],
        index_unique_values_map={"FLUID": ["oil", "gas", "water"], "ZONE": ["Valysar"], "REGION": ["North"]},
    )
    return mock


def _make_sim_access_mock(
    table_names: list[str],
    fipnums: list[str] | None = None,
    pa_table: pa.Table | None = None,
) -> AsyncMock:
    mock = AsyncMock()
    mock.get_table_names_async.return_value = table_names
    mock.get_volume_columns_and_index_unique_values_async.return_value = VolumeColumnsAndIndexUniqueValues(
        volume_columns=["STOIIP", "GIIP", "ASSOCIATEDGAS", "ASSOCIATEDOIL", "HCPV"],
        index_unique_values_map={"FLUID": ["oil", "gas"], "FIPNUM": fipnums if fipnums is not None else ["1", "2"]},
    )
    if pa_table is not None:
        mock.get_aggregated_table_async.return_value = pa_table
    return mock


def _make_fip_mapping_access_mock(mapping_df: pl.DataFrame | None) -> AsyncMock:
    mock = AsyncMock()
    mock.get_fip_regions_mapping_df_async.return_value = mapping_df
    return mock


@pytest.mark.asyncio
async def test_metadata_returns_static_and_simulator_tables_with_expected_results() -> None:
    static_access = _make_static_access_mock(table_names=["geogrid"])
    sim_access = _make_sim_access_mock(table_names=["simgrid"], fipnums=["1", "2"])
    mapping_df = pl.DataFrame({"FIPNUM": [1, 2], "ZONE": ["Valysar", "Therys"], "REGION": ["North", "South"]})
    mapping_access = _make_fip_mapping_access_mock(mapping_df)

    assembler = InplaceVolumesTableAssembler(static_access, sim_access, mapping_access)
    result = await assembler.get_inplace_volumes_tables_metadata_async()
    assert not result.has_warnings()
    tables = result.get_value()

    assert len(tables) == 2
    static_def = next(t for t in tables if t.table_source == InplaceVolumesTableSource.STATIC)
    sim_def = next(t for t in tables if t.table_source == InplaceVolumesTableSource.SIMULATOR)

    assert static_def.table_name == "geogrid"
    assert sim_def.table_name == "simgrid"
    assert sim_def.fluids == [InplaceVolumes.Fluid.oil, InplaceVolumes.Fluid.gas]
    assert set(sim_def.result_names) == {
        "STOIIP",
        "GIIP",
        "ASSOCIATEDGAS",
        "ASSOCIATEDOIL",
        "HCPV",
        "STOIIP_TOTAL",
        "GIIP_TOTAL",
        "BO",
        "BG",
    }

    sim_indices = {iwv.index: iwv.values for iwv in sim_def.indices_with_values}
    assert sim_indices[InplaceVolumes.TableIndexColumns.FLUID] == ["oil", "gas"]
    assert sim_indices[InplaceVolumes.TableIndexColumns.ZONE] == ["Valysar", "Therys"]
    assert sim_indices[InplaceVolumes.TableIndexColumns.REGION] == ["North", "South"]


@pytest.mark.asyncio
async def test_metadata_missing_mapping_skips_simulator_tables_with_warning() -> None:
    static_access = _make_static_access_mock(table_names=["geogrid"])
    sim_access = _make_sim_access_mock(table_names=["simgrid"])
    mapping_access = _make_fip_mapping_access_mock(None)

    assembler = InplaceVolumesTableAssembler(static_access, sim_access, mapping_access)
    result = await assembler.get_inplace_volumes_tables_metadata_async()

    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "simulator_fipregions_mapping" in warnings[0].message

    tables = result.get_value()
    assert len(tables) == 1
    assert tables[0].table_source == InplaceVolumesTableSource.STATIC


@pytest.mark.asyncio
async def test_metadata_conflicting_mapping_skips_simulator_tables_with_warning() -> None:
    static_access = _make_static_access_mock(table_names=[])
    sim_access = _make_sim_access_mock(table_names=["simgrid"])
    conflicting_mapping_df = pl.DataFrame(
        {"FIPNUM": [1, 1], "ZONE": ["Valysar", "Therys"], "REGION": ["North", "North"]}
    )
    mapping_access = _make_fip_mapping_access_mock(conflicting_mapping_df)

    assembler = InplaceVolumesTableAssembler(static_access, sim_access, mapping_access)
    result = await assembler.get_inplace_volumes_tables_metadata_async()

    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "conflicting FIPNUM" in warnings[0].message
    assert result.get_value() == []


@pytest.mark.asyncio
async def test_metadata_unmapped_fipnum_emits_warning() -> None:
    static_access = _make_static_access_mock(table_names=[])
    sim_access = _make_sim_access_mock(table_names=["simgrid"], fipnums=["1", "99"])
    mapping_df = pl.DataFrame({"FIPNUM": [1], "ZONE": ["Valysar"], "REGION": ["North"]})
    mapping_access = _make_fip_mapping_access_mock(mapping_df)

    assembler = InplaceVolumesTableAssembler(static_access, sim_access, mapping_access)
    result = await assembler.get_inplace_volumes_tables_metadata_async()

    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "99" in warnings[0].message

    tables = result.get_value()
    assert len(tables) == 1
    sim_indices = {iwv.index: iwv.values for iwv in tables[0].indices_with_values}
    assert sim_indices[InplaceVolumes.TableIndexColumns.ZONE] == ["Valysar"]


@pytest.mark.asyncio
async def test_simulator_per_realization_n_to_1_mapping_sums_and_propagates_warnings() -> None:
    # FIPNUM 1 and 2 both map to (Valysar, North); FIPNUM 99 is unmapped;
    # REAL 0 has earliest date 2020-01-01 (plus later date 2021-01-01 to be filtered out),
    # REAL 1 has earliest date 2020-02-01 (triggers differing earliest date warning).
    sim_pa_table = pa.table(
        {
            "REAL": [0, 0, 0, 0, 1, 1],
            "DATE": [
                date(2020, 1, 1),
                date(2020, 1, 1),
                date(2021, 1, 1),
                date(2020, 1, 1),
                date(2020, 2, 1),
                date(2020, 2, 1),
            ],
            "FIPNUM": [1, 2, 1, 99, 1, 2],
            "FLUID": ["oil", "oil", "oil", "oil", "oil", "oil"],
            "STOIIP": [100.0, 50.0, 999.0, 777.0, 200.0, 100.0],
        }
    )
    mapping_df = pl.DataFrame(
        {
            "FIPNUM": [1, 2],
            "ZONE": ["Valysar", "Valysar"],
            "REGION": ["North", "North"],
        }
    )

    assembler = InplaceVolumesTableAssembler(
        _make_static_access_mock(),
        _make_sim_access_mock(["simgrid"], pa_table=sim_pa_table),
        _make_fip_mapping_access_mock(mapping_df),
    )

    result = await assembler.create_accumulated_by_selection_per_realization_volumes_table_data_async(
        table_name="simgrid",
        result_names={"STOIIP"},
        indices_with_values=[
            InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns.FLUID, values=["oil"]),
            InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns.ZONE, values=["Valysar"]),
            InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns.REGION, values=["North"]),
        ],
        group_by_indices=[InplaceVolumes.TableIndexColumns.FLUID, InplaceVolumes.TableIndexColumns.ZONE],
        realizations=[0, 1, 2],  # REAL 2 is missing -> triggers missing-realization warning too
        table_source=InplaceVolumesTableSource.SIMULATOR,
    )

    warnings = result.get_warnings()
    warning_messages = " | ".join(w.message for w in warnings)
    assert "differing earliest DATE" in warning_messages
    assert "99" in warning_messages
    assert "Realization: 2" in warning_messages

    data = result.get_value()
    assert len(data.table_data_per_fluid_selection) == 1
    oil_table = data.table_data_per_fluid_selection[0]
    assert oil_table.fluid_selection == "oil"

    real_col = next(c for c in oil_table.selector_columns if c.column_name == "REAL")
    stoiip_col = next(c for c in oil_table.result_columns if c.column_name == "STOIIP")
    real_to_stoiip = {
        real_col.unique_values[real_col.indices[i]]: stoiip_col.values[i] for i in range(len(stoiip_col.values))
    }
    # REAL 0: 100 + 50 = 150 (2021-01-01 row 999 and unmapped FIPNUM 99 row 777 excluded)
    # REAL 1: 200 + 100 = 300
    assert real_to_stoiip == {0: 150.0, 1: 300.0}


@pytest.mark.asyncio
async def test_simulator_statistical_n_to_1_mapping_aggregates_and_propagates_warnings() -> None:
    sim_pa_table = pa.table(
        {
            "REAL": [0, 0, 1, 1, 1],
            "DATE": [date(2020, 1, 1)] * 5,
            "FIPNUM": [1, 2, 1, 2, 99],
            "FLUID": ["oil"] * 5,
            "STOIIP": [100.0, 50.0, 200.0, 100.0, 500.0],
        }
    )
    mapping_df = pl.DataFrame(
        {
            "FIPNUM": [1, 2],
            "ZONE": ["Valysar", "Valysar"],
            "REGION": ["North", "North"],
        }
    )

    assembler = InplaceVolumesTableAssembler(
        _make_static_access_mock(),
        _make_sim_access_mock(["simgrid"], pa_table=sim_pa_table),
        _make_fip_mapping_access_mock(mapping_df),
    )

    result = await assembler.create_accumulated_by_selection_statistical_volumes_table_data_async(
        table_name="simgrid",
        result_names={"STOIIP"},
        indices_with_values=[
            InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns.FLUID, values=["oil"]),
            InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns.ZONE, values=["Valysar"]),
            InplaceVolumesIndexWithValues(index=InplaceVolumes.TableIndexColumns.REGION, values=["North"]),
        ],
        group_by_indices=[InplaceVolumes.TableIndexColumns.FLUID, InplaceVolumes.TableIndexColumns.ZONE],
        realizations=None,
        table_source=InplaceVolumesTableSource.SIMULATOR,
    )

    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "99" in warnings[0].message

    data = result.get_value()
    assert len(data.table_data_per_fluid_selection) == 1
    oil_stats = data.table_data_per_fluid_selection[0]
    stoiip_stats = next(c for c in oil_stats.result_column_statistics if c.column_name == "STOIIP")
    # Mean of [150.0, 300.0] = 225.0, min = 150.0, max = 300.0
    assert stoiip_stats.statistic_values[Statistic.MEAN] == [225.0]
    assert stoiip_stats.statistic_values[Statistic.MIN] == [150.0]
    assert stoiip_stats.statistic_values[Statistic.MAX] == [300.0]


@pytest.mark.asyncio
async def test_metadata_broken_simulator_table_does_not_hide_static_tables() -> None:
    static_access = _make_static_access_mock(table_names=["geogrid"])
    sim_access = AsyncMock()
    sim_access.get_table_names_async.return_value = ["broken_sim", "healthy_sim"]

    async def get_meta_side_effect(table_name: str) -> VolumeColumnsAndIndexUniqueValues:
        if table_name == "broken_sim":
            raise InvalidDataError("DATE column is missing", Service.GENERAL)
        return VolumeColumnsAndIndexUniqueValues(
            volume_columns=["STOIIP", "HCPV"],
            index_unique_values_map={"FLUID": ["oil"], "FIPNUM": ["1"]},
        )

    sim_access.get_volume_columns_and_index_unique_values_async.side_effect = get_meta_side_effect
    mapping_df = pl.DataFrame({"FIPNUM": [1], "ZONE": ["Valysar"], "REGION": ["North"]})

    assembler = InplaceVolumesTableAssembler(static_access, sim_access, _make_fip_mapping_access_mock(mapping_df))
    result = await assembler.get_inplace_volumes_tables_metadata_async()

    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "broken_sim" in warnings[0].message

    tables = result.get_value()
    assert [(t.table_name, t.table_source) for t in tables] == [
        ("geogrid", InplaceVolumesTableSource.STATIC),
        ("healthy_sim", InplaceVolumesTableSource.SIMULATOR),
    ]


@pytest.mark.asyncio
async def test_metadata_mapping_data_error_does_not_hide_static_tables() -> None:
    static_access = _make_static_access_mock(table_names=["geogrid"])
    sim_access = _make_sim_access_mock(table_names=["simgrid"])
    mapping_access = AsyncMock()
    mapping_access.get_fip_regions_mapping_df_async.side_effect = InvalidDataError(
        "Malformed mapping table", Service.SUMO
    )

    assembler = InplaceVolumesTableAssembler(static_access, sim_access, mapping_access)
    result = await assembler.get_inplace_volumes_tables_metadata_async()

    warnings = result.get_warnings()
    assert len(warnings) == 1
    assert "simulator_fipregions_mapping" in warnings[0].message

    tables = result.get_value()
    assert [(t.table_name, t.table_source) for t in tables] == [("geogrid", InplaceVolumesTableSource.STATIC)]


@pytest.mark.asyncio
async def test_metadata_transient_timeout_is_not_swallowed() -> None:
    static_access = _make_static_access_mock(table_names=["geogrid"])
    sim_access = _make_sim_access_mock(table_names=["simgrid"])
    mapping_access = AsyncMock()
    mapping_access.get_fip_regions_mapping_df_async.side_effect = ServiceTimeoutError("Sumo timeout", Service.SUMO)

    assembler = InplaceVolumesTableAssembler(static_access, sim_access, mapping_access)
    with pytest.raises(ServiceTimeoutError):
        await assembler.get_inplace_volumes_tables_metadata_async()


@pytest.mark.asyncio
async def test_accessor_float_fipnum_column_resolves_zone_and_region_through_assembler() -> None:
    pa_table = pa.table(
        {
            "DATE": [date(2020, 1, 1), date(2020, 1, 1)],
            "FLUID": ["oil", "gas"],
            "FIPNUM": pa.array([1.0, 2.0], type=pa.float64()),
            "STOIIP": [100.0, 0.0],
            "GIIP": [0.0, 200.0],
            "HCPV": [120.0, 250.0],
        }
    )

    with (
        patch("webviz_services.sumo_access.simulator_inplace_volumes_table_access.SearchContext"),
        patch("webviz_services.sumo_access.simulator_inplace_volumes_table_access.ArrowTableLoader") as mock_loader_cls,
    ):
        mock_loader = mock_loader_cls.return_value
        mock_loader.get_single_realization_async = AsyncMock(return_value=pa_table)

        sim_access = SimulatorInplaceVolumesTableAccess(MagicMock(), "case-uuid", "iter-0")
        sim_access.get_table_names_async = AsyncMock(return_value=["simgrid"])  # type: ignore[method-assign]
        with patch.object(sim_access, "_get_first_realization_with_table_async", AsyncMock(return_value=0)):
            mapping_df = pl.DataFrame({"FIPNUM": [1, 2], "ZONE": ["Valysar", "Therys"], "REGION": ["North", "South"]})
            assembler = InplaceVolumesTableAssembler(
                _make_static_access_mock(table_names=[]),
                sim_access,
                _make_fip_mapping_access_mock(mapping_df),
            )
            result = await assembler.get_inplace_volumes_tables_metadata_async()

    assert not result.has_warnings()
    tables = result.get_value()
    assert len(tables) == 1
    indices = {iwv.index: iwv.values for iwv in tables[0].indices_with_values}
    assert indices[InplaceVolumes.TableIndexColumns.ZONE] == ["Valysar", "Therys"]
    assert indices[InplaceVolumes.TableIndexColumns.REGION] == ["North", "South"]


@pytest.mark.asyncio
async def test_metadata_no_matching_fipnums_skips_simulator_table_with_warning() -> None:
    static_access = _make_static_access_mock(table_names=["geogrid"])
    sim_access = _make_sim_access_mock(table_names=["simgrid"], fipnums=["99"])
    mapping_df = pl.DataFrame({"FIPNUM": [1], "ZONE": ["Valysar"], "REGION": ["North"]})

    assembler = InplaceVolumesTableAssembler(static_access, sim_access, _make_fip_mapping_access_mock(mapping_df))
    result = await assembler.get_inplace_volumes_tables_metadata_async()

    warnings = result.get_warnings()
    assert len(warnings) == 2
    assert any("none of its FIPNUM values matched" in w.message for w in warnings)

    tables = result.get_value()
    assert [(t.table_name, t.table_source) for t in tables] == [("geogrid", InplaceVolumesTableSource.STATIC)]

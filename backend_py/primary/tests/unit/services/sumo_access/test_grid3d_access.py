from typing import Any, Optional

import pytest

from webviz_services.sumo_access.grid3d_access import (
    Grid3dCodename,
    _create_grid_property_info,
    _get_grid_properties_info_async,
)


class _FakeGridProperty:
    def __init__(self, metadata: dict[str, Any]) -> None:
        self.metadata = metadata


class _FakeGridProperties:
    def __init__(self, properties: list[_FakeGridProperty]) -> None:
        self._properties = properties
        self._curr_index = 0

    def __aiter__(self) -> "_FakeGridProperties":
        self._curr_index = 0
        return self

    async def __anext__(self) -> _FakeGridProperty:
        if self._curr_index >= len(self._properties):
            raise StopAsyncIteration

        prop = self._properties[self._curr_index]
        self._curr_index += 1
        return prop


class _FakeGrid:
    def __init__(self, properties: list[_FakeGridProperty]) -> None:
        self.grid_properties = _FakeGridProperties(properties)


def _make_property_metadata(
    property_name: str,
    attribute: str,
    is_discrete: bool,
    codenames: Optional[dict[int, str]] = None,
    t0: Optional[str] = None,
    t1: Optional[str] = None,
) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "data": {
            "content": "property",
            "name": property_name,
            "stratigraphic": False,
            "format": "roff",
            "is_observation": False,
            "is_prediction": True,
            "spec": {
                "nrow": 2,
                "ncol": 2,
                "nlay": 1,
            },
            "property": {
                "attribute": attribute,
                "is_discrete": is_discrete,
            },
        }
    }

    if codenames is not None:
        metadata["data"]["spec"]["codenames"] = codenames

    if t0 is not None:
        metadata["data"]["time"] = {
            "t0": {
                "value": t0,
            }
        }

    if t1 is not None:
        metadata["data"]["time"]["t1"] = {
            "value": t1,
        }

    return metadata


def test_create_grid_property_info_formats_interval_and_sorts_codenames() -> None:
    property_info = _create_grid_property_info(
        _make_property_metadata(
            property_name="FACIES",
            attribute="facies",
            is_discrete=True,
            codenames={3: "Shale", 1: "Sand"},
            t0="2020-01-01T00:00:00",
            t1="2020-02-01T00:00:00",
        )
    )

    assert property_info.property_name == "FACIES"
    assert property_info.is_discrete is True
    assert property_info.iso_date_or_interval == "2020-01-01/2020-02-01"
    assert property_info.codenames == [
        Grid3dCodename(code=1, name="Sand"),
        Grid3dCodename(code=3, name="Shale"),
    ]


@pytest.mark.asyncio
async def test_get_grid_properties_info_async_preserves_actual_property_time_pairs() -> None:
    fake_grid = _FakeGrid(
        [
            _FakeGridProperty(
                _make_property_metadata(
                    property_name="FACIES",
                    attribute="facies",
                    is_discrete=True,
                    codenames={2: "Channel", 4: "Shale"},
                    t0="2020-01-01T00:00:00",
                )
            ),
            _FakeGridProperty(
                _make_property_metadata(
                    property_name="PORO",
                    attribute="porosity",
                    is_discrete=False,
                )
            ),
            _FakeGridProperty(
                _make_property_metadata(
                    property_name="FACIES",
                    attribute="facies",
                    is_discrete=True,
                    codenames={2: "Channel", 4: "Shale"},
                    t0="2020-03-01T00:00:00",
                )
            ),
        ]
    )

    property_info_arr = await _get_grid_properties_info_async(fake_grid)  # type: ignore[arg-type]

    assert [(item.property_name, item.iso_date_or_interval) for item in property_info_arr] == [
        ("FACIES", "2020-01-01"),
        ("FACIES", "2020-03-01"),
        ("PORO", None),
    ]

    assert property_info_arr[0].is_discrete is True
    assert property_info_arr[0].codenames == [
        Grid3dCodename(code=2, name="Channel"),
        Grid3dCodename(code=4, name="Shale"),
    ]
    assert property_info_arr[-1].is_discrete is False
    assert property_info_arr[-1].codenames is None
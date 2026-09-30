"""Generate synthetic surface fixtures for the frontend's mocked e2e and component tests.

Run from backend_py/primary: python -m scripts.generate_frontend_fixtures
"""

import json
from pathlib import Path
from typing import Any

import numpy as np
import xtgeo

from primary.routers.surface import schemas
from primary.routers.surface.converters import to_api_surface_data_float

# Must match SYNTH in frontend/tests/mocks/syntheticField/synth.ts
CASE_UUID = "5e7e7e7e-0000-4000-8000-000000000001"
ENSEMBLE_NAME = "iter-0"
REALIZATIONS = list(range(10))

ATTRIBUTE_NAME = "depth"
TOP_NAME = "Top SYNTH"
BASE_NAME = "Base SYNTH"

NCOL = 40
NROW = 30
XINC = 50.0
YINC = 50.0
XORI = 456000.0
YORI = 5930000.0

OUTPUT_DIR = Path(__file__).resolve().parents[3] / "frontend" / "tests" / "mocks" / "fixtures" / "surfaces"


def _node_coordinates() -> tuple[np.ndarray, np.ndarray]:
    # xtgeo stores values as (ncol, nrow)
    x = XORI + XINC * np.arange(NCOL)
    y = YORI + YINC * np.arange(NROW)
    return np.meshgrid(x, y, indexing="ij")


def _make_depths(realization: int) -> tuple[np.ndarray, np.ndarray]:
    x, y = _node_coordinates()
    center_x = XORI + XINC * (NCOL - 1) * 0.5
    center_y = YORI + YINC * (NROW - 1) * 0.5
    dome = np.exp(-0.5 * (((x - center_x) / 600.0) ** 2 + ((y - center_y) / 450.0) ** 2))

    rng = np.random.default_rng(1000 + realization)
    offset = rng.normal(0.0, 8.0)
    tilt_x, tilt_y = rng.uniform(-0.01, 0.01, size=2)
    thickness_offset = rng.uniform(-5.0, 5.0)

    top = 1650.0 - 120.0 * dome + offset + tilt_x * (x - center_x) + tilt_y * (y - center_y)
    base = top + 60.0 + 20.0 * dome + thickness_offset
    return top, base


def _make_surface(values: np.ndarray) -> xtgeo.RegularSurface:
    return xtgeo.RegularSurface(
        ncol=NCOL, nrow=NROW, xinc=XINC, yinc=YINC, xori=XORI, yori=YORI, rotation=0.0, values=values
    )


def _file_name(surface_name: str, realization: int) -> str:
    slug = surface_name.lower().replace(" ", "_")
    return f"{slug}--{ATTRIBUTE_NAME}--real-{realization}.json"


def _write_json(file_name: str, content: Any) -> int:
    text = json.dumps(content, sort_keys=True, indent=4) + "\n"
    (OUTPUT_DIR / file_name).write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    value_ranges: dict[str, tuple[float, float]] = {}
    manifest_entries: list[dict[str, Any]] = []
    total_bytes = 0

    for realization in REALIZATIONS:
        top, base = _make_depths(realization)
        for surface_name, values in ((TOP_NAME, top), (BASE_NAME, base)):
            surface_data = to_api_surface_data_float(_make_surface(values))
            file_name = _file_name(surface_name, realization)
            total_bytes += _write_json(file_name, surface_data.model_dump(mode="json"))

            prev_min, prev_max = value_ranges.get(surface_name, (np.inf, -np.inf))
            value_ranges[surface_name] = (
                min(prev_min, surface_data.value_min),
                max(prev_max, surface_data.value_max),
            )
            manifest_entries.append(
                {"name": surface_name, "attribute": ATTRIBUTE_NAME, "realization": realization, "file": file_name}
            )

    meta_set = schemas.SurfaceMetaSet(
        surfaces=[
            schemas.SurfaceMeta(
                name=surface_name,
                name_is_stratigraphic_offical=True,
                attribute_name=ATTRIBUTE_NAME,
                attribute_type=schemas.SurfaceAttributeType.DEPTH,
                time_type=schemas.SurfaceTimeType.NO_TIME,
                is_observation=False,
                value_min=value_ranges[surface_name][0],
                value_max=value_ranges[surface_name][1],
            )
            for surface_name in (TOP_NAME, BASE_NAME)
        ],
        time_points_iso_str=[],
        time_intervals_iso_str=[],
        surface_names_in_strat_order=[TOP_NAME, BASE_NAME],
    )
    total_bytes += _write_json("metadata.json", meta_set.model_dump(mode="json"))

    manifest = {"caseUuid": CASE_UUID, "ensembleName": ENSEMBLE_NAME, "surfaces": manifest_entries}
    total_bytes += _write_json("manifest.json", manifest)

    print(f"Wrote {len(manifest_entries) + 2} files ({total_bytes / 1024:.1f} KiB) to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

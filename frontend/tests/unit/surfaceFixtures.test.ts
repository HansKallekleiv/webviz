import { describe, expect, test } from "vitest";

import type {
    B64FloatArray_api,
    BoundingBox2d_api,
    SurfaceDataFloat_api,
    SurfaceDef_api,
    SurfaceMeta_api,
    SurfaceMetaSet_api,
} from "@api";
import { SurfaceAttributeType_api, SurfaceTimeType_api } from "@api";
import { b64DecodeFloatArrayToFloat32 } from "@modules/_shared/base64";

import { SURFACE_FIXTURE_MANIFEST, loadSurfaceFixture } from "../mocks/handlers/surface";
import { SYNTH, SYNTH_SURFACE_METADATA } from "../mocks/syntheticField";

// `satisfies` makes `npm run typecheck` fail when a generated type gains or loses a field.
const SURFACE_DATA_FLOAT_KEYS = {
    format: true,
    surface_def: true,
    transformed_bbox_utm: true,
    value_min: true,
    value_max: true,
    values_b64arr: true,
} satisfies Record<keyof Required<SurfaceDataFloat_api>, true>;

const SURFACE_DEF_KEYS = {
    npoints_x: true,
    npoints_y: true,
    inc_x: true,
    inc_y: true,
    origin_utm_x: true,
    origin_utm_y: true,
    rot_deg: true,
} satisfies Record<keyof Required<SurfaceDef_api>, true>;

const BOUNDING_BOX_2D_KEYS = {
    min_x: true,
    min_y: true,
    max_x: true,
    max_y: true,
} satisfies Record<keyof Required<BoundingBox2d_api>, true>;

const B64_FLOAT_ARRAY_KEYS = {
    element_type: true,
    data_b64str: true,
} satisfies Record<keyof Required<B64FloatArray_api>, true>;

const SURFACE_META_SET_KEYS = {
    surfaces: true,
    time_points_iso_str: true,
    time_intervals_iso_str: true,
    surface_names_in_strat_order: true,
} satisfies Record<keyof Required<SurfaceMetaSet_api>, true>;

const SURFACE_META_KEYS = {
    name: true,
    name_is_stratigraphic_offical: true,
    attribute_name: true,
    attribute_type: true,
    time_type: true,
    is_observation: true,
    value_min: true,
    value_max: true,
} satisfies Record<keyof Required<SurfaceMeta_api>, true>;

const ELEMENT_TYPES = { float32: true, float64: true } satisfies Record<B64FloatArray_api["element_type"], true>;
const DATA_FORMATS = { float: true } satisfies Record<NonNullable<SurfaceDataFloat_api["format"]>, true>;

function sortedKeys(value: object): string[] {
    return Object.keys(value).sort();
}

function finiteMinMax(values: Float32Array): [number, number] {
    let min = Infinity;
    let max = -Infinity;
    for (const value of values) {
        if (Number.isNaN(value)) continue;
        min = Math.min(min, value);
        max = Math.max(max, value);
    }
    return [min, max];
}

describe("surface fixtures", () => {
    test.each(SURFACE_FIXTURE_MANIFEST.surfaces)("$file decodes to its declared size and range", ({ file }) => {
        const data = loadSurfaceFixture(file);
        const values = b64DecodeFloatArrayToFloat32(data.values_b64arr);

        expect(values).toHaveLength(data.surface_def.npoints_x * data.surface_def.npoints_y);
        const [min, max] = finiteMinMax(values);
        expect(min).toBeCloseTo(data.value_min, 3);
        expect(max).toBeCloseTo(data.value_max, 3);
    });

    test("manifest covers the synthetic ensemble", () => {
        expect(SURFACE_FIXTURE_MANIFEST.caseUuid).toBe(SYNTH.caseUuid);
        expect(SURFACE_FIXTURE_MANIFEST.ensembleName).toBe(SYNTH.ensembleName);

        for (const name of SYNTH_SURFACE_METADATA.surface_names_in_strat_order) {
            const realizations = SURFACE_FIXTURE_MANIFEST.surfaces
                .filter((surface) => surface.name === name)
                .map((surface) => surface.realization)
                .sort((a, b) => a - b);
            expect(realizations).toEqual(SYNTH.realizations);
        }
    });

    test("metadata names and ranges match the manifest", () => {
        const manifestNames = [...new Set(SURFACE_FIXTURE_MANIFEST.surfaces.map((surface) => surface.name))];
        expect(SYNTH_SURFACE_METADATA.surfaces.map((surface) => surface.name).sort()).toEqual(manifestNames.sort());
        expect([...SYNTH_SURFACE_METADATA.surface_names_in_strat_order].sort()).toEqual(manifestNames.sort());

        for (const meta of SYNTH_SURFACE_METADATA.surfaces) {
            const fixtures = SURFACE_FIXTURE_MANIFEST.surfaces
                .filter((surface) => surface.name === meta.name && surface.attribute === meta.attribute_name)
                .map((surface) => loadSurfaceFixture(surface.file));
            expect(meta.value_min).toBe(Math.min(...fixtures.map((data) => data.value_min)));
            expect(meta.value_max).toBe(Math.max(...fixtures.map((data) => data.value_max)));
        }
    });
});

describe("surface fixture shapes match the generated types", () => {
    test.each(SURFACE_FIXTURE_MANIFEST.surfaces)("$file has exactly the SurfaceDataFloat_api keys", ({ file }) => {
        const data = loadSurfaceFixture(file);

        expect(sortedKeys(data)).toEqual(sortedKeys(SURFACE_DATA_FLOAT_KEYS));
        expect(sortedKeys(data.surface_def)).toEqual(sortedKeys(SURFACE_DEF_KEYS));
        expect(sortedKeys(data.transformed_bbox_utm)).toEqual(sortedKeys(BOUNDING_BOX_2D_KEYS));
        expect(sortedKeys(data.values_b64arr)).toEqual(sortedKeys(B64_FLOAT_ARRAY_KEYS));

        expect(Object.keys(DATA_FORMATS)).toContain(data.format);
        expect(Object.keys(ELEMENT_TYPES)).toContain(data.values_b64arr.element_type);
    });

    test("metadata set has exactly the SurfaceMetaSet_api keys", () => {
        expect(sortedKeys(SYNTH_SURFACE_METADATA)).toEqual(sortedKeys(SURFACE_META_SET_KEYS));
    });

    test.each(SYNTH_SURFACE_METADATA.surfaces)("metadata for $name has exactly the SurfaceMeta_api keys", (meta) => {
        expect(sortedKeys(meta)).toEqual(sortedKeys(SURFACE_META_KEYS));

        expect(Object.values(SurfaceAttributeType_api)).toContain(meta.attribute_type);
        expect(Object.values(SurfaceTimeType_api)).toContain(meta.time_type);
    });
});

import { describe, expect, test } from "vitest";

import { b64DecodeFloatArrayToFloat32 } from "@modules/_shared/base64";

import { SURFACE_FIXTURE_MANIFEST, loadSurfaceFixture } from "../mocks/handlers/surface";
import { SYNTH, SYNTH_SURFACE_METADATA } from "../mocks/syntheticField";

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

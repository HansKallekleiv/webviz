import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { SurfaceAttributeType_api, SurfaceStandardResult_api, SurfaceTimeType_api } from "@api";
import type { SurfaceMeta_api, SurfaceMetaSet_api } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { makeStdResAttribute, makeTagNameAttribute, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { intersectSurfaceMetaSets, makeDeltaSurfaceDataQuery } from "@modules/_shared/Surface/deltaSurfaceUtils";

const COMPARISON_IDENT = new RegularEnsembleIdent("11111111-aaaa-4444-aaaa-aaaaaaaaaaaa", "iter-1");
const REFERENCE_IDENT = new RegularEnsembleIdent("22222222-bbbb-4444-bbbb-bbbbbbbbbbbb", "iter-0");
const DELTA_IDENT = new DeltaEnsembleIdent(COMPARISON_IDENT, REFERENCE_IDENT);

function makeMeta(
    name: string,
    tagName: string,
    timeType: SurfaceTimeType_api = SurfaceTimeType_api.NO_TIME,
    valueMin: number | null = null,
): SurfaceMeta_api {
    return {
        name,
        name_is_stratigraphic_offical: true,
        attribute: makeTagNameAttribute(tagName) as SurfaceMeta_api["attribute"],
        attribute_type: SurfaceAttributeType_api.DEPTH,
        time_type: timeType,
        is_observation: false,
        value_min: valueMin,
        value_max: null,
    };
}

function makeMetaSet(partial: Partial<SurfaceMetaSet_api>): SurfaceMetaSet_api {
    return {
        surfaces: [],
        time_points_iso_str: [],
        time_intervals_iso_str: [],
        surface_names_in_strat_order: [],
        ...partial,
    };
}

describe("intersectSurfaceMetaSets", () => {
    test("keeps only surfaces matching on name, attribute and time type", () => {
        const a = makeMetaSet({
            surfaces: [
                makeMeta("Top", "depth"),
                makeMeta("Base", "depth"),
                makeMeta("Top", "thickness"),
                makeMeta("Top", "depth", SurfaceTimeType_api.TIME_POINT),
            ],
        });
        const b = makeMetaSet({
            surfaces: [makeMeta("Top", "depth"), makeMeta("Top", "thickness", SurfaceTimeType_api.INTERVAL)],
        });

        const result = intersectSurfaceMetaSets(a, b);

        expect(result.surfaces).toHaveLength(1);
        expect(result.surfaces[0].name).toBe("Top");
        expect(result.surfaces[0].time_type).toBe(SurfaceTimeType_api.NO_TIME);
    });

    test("matches standard result attributes including sub name", () => {
        const stdRes = (subName: string | null): SurfaceMeta_api => ({
            ...makeMeta("Top", "unused"),
            attribute: makeStdResAttribute(
                SurfaceStandardResult_api.STRUCTURE_DEPTH_ISOCHORE,
                subName,
            ) as SurfaceMeta_api["attribute"],
        });

        const result = intersectSurfaceMetaSets(
            makeMetaSet({ surfaces: [stdRes("x"), stdRes(null)] }),
            makeMetaSet({ surfaces: [stdRes("x")] }),
        );

        expect(result.surfaces).toHaveLength(1);
    });

    test("keeps entries from a with their value hints", () => {
        const a = makeMetaSet({ surfaces: [makeMeta("Top", "depth", SurfaceTimeType_api.NO_TIME, 5)] });
        const b = makeMetaSet({ surfaces: [makeMeta("Top", "depth", SurfaceTimeType_api.NO_TIME, 99)] });

        expect(intersectSurfaceMetaSets(a, b).surfaces[0].value_min).toBe(5);
    });

    test("intersects time points and intervals preserving the order of a", () => {
        const a = makeMetaSet({
            time_points_iso_str: ["2020-01-01", "2019-01-01", "2021-01-01"],
            time_intervals_iso_str: ["2018/2019", "2019/2020"],
        });
        const b = makeMetaSet({
            time_points_iso_str: ["2021-01-01", "2020-01-01", "2022-01-01"],
            time_intervals_iso_str: ["2019/2020"],
        });

        const result = intersectSurfaceMetaSets(a, b);

        expect(result.time_points_iso_str).toEqual(["2020-01-01", "2021-01-01"]);
        expect(result.time_intervals_iso_str).toEqual(["2019/2020"]);
    });

    test("takes strat order from a", () => {
        const a = makeMetaSet({ surface_names_in_strat_order: ["Top", "Mid", "Base"] });
        const b = makeMetaSet({ surface_names_in_strat_order: ["Base", "Top"] });

        expect(intersectSurfaceMetaSets(a, b).surface_names_in_strat_order).toEqual(["Top", "Mid", "Base"]);
    });

    test("handles empty inputs", () => {
        const nonEmpty = makeMetaSet({
            surfaces: [makeMeta("Top", "depth")],
            time_points_iso_str: ["2020-01-01"],
            time_intervals_iso_str: ["2019/2020"],
            surface_names_in_strat_order: ["Top"],
        });
        const empty = makeMetaSet({});

        const result = intersectSurfaceMetaSets(nonEmpty, empty);
        expect(result.surfaces).toEqual([]);
        expect(result.time_points_iso_str).toEqual([]);
        expect(result.time_intervals_iso_str).toEqual([]);

        expect(intersectSurfaceMetaSets(empty, nonEmpty).surfaces).toEqual([]);
        expect(intersectSurfaceMetaSets(empty, empty)).toEqual(empty);
    });
});

describe("makeDeltaSurfaceDataQuery", () => {
    beforeEach(() => {
        EnsembleFingerprintStore.setAll(
            new Map([
                [COMPARISON_IDENT.toString(), "fingerprint-comparison"],
                [REFERENCE_IDENT.toString(), "fingerprint-reference"],
            ]),
        );
    });

    afterEach(() => {
        EnsembleFingerprintStore.clear();
    });

    function makeAddress(ensembleIdent: RegularEnsembleIdent) {
        return new SurfaceAddressBuilder()
            .withEnsembleIdent(ensembleIdent)
            .withName("Top")
            .withTagNameAttribute("depth")
            .withRealization(3)
            .buildRealizationAddress();
    }

    test("builds query with comparison address, reference params and cache busting", () => {
        const query = makeDeltaSurfaceDataQuery(makeAddress(COMPARISON_IDENT), DELTA_IDENT, "float");

        expect(query).toEqual({
            surf_addr_str: `REAL~~${COMPARISON_IDENT.getCaseUuid()}~~iter-1~~Top~~TAGNAME~~depth~~~~3`,
            reference_case_uuid: REFERENCE_IDENT.getCaseUuid(),
            reference_ensemble_name: "iter-0",
            data_format: "float",
            resample_to_def_str: null,
            ...makeCacheBustingQueryParam(COMPARISON_IDENT, REFERENCE_IDENT),
        });
        expect(query._cacheBust).toBeTruthy();
    });

    test("passes through the data format", () => {
        const query = makeDeltaSurfaceDataQuery(makeAddress(COMPARISON_IDENT), DELTA_IDENT, "png");

        expect(query.data_format).toBe("png");
    });

    test("throws when the address is not on the comparison ensemble", () => {
        expect(() => makeDeltaSurfaceDataQuery(makeAddress(REFERENCE_IDENT), DELTA_IDENT, "float")).toThrow();
    });
});

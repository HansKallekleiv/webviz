import { describe, expect, test } from "vitest";

import {
    SYNTH,
    SYNTH_TIMESTAMPS_UTC_MS,
    SYNTH_VECTORS,
    computeSynthStatistics,
    getRealizationValues,
} from "../mocks/syntheticField";

describe("syntheticField", () => {
    test("two calls give identical output", () => {
        for (const vector of SYNTH_VECTORS) {
            expect(computeSynthStatistics(vector.name)).toEqual(computeSynthStatistics(vector.name));
            for (const real of SYNTH.realizations) {
                expect(getRealizationValues(vector.name, real)).toEqual(getRealizationValues(vector.name, real));
            }
        }
    });

    test("realizations are positive and differ from each other", () => {
        for (const vector of SYNTH_VECTORS) {
            const curves = SYNTH.realizations.map((real) => getRealizationValues(vector.name, real));
            for (const curve of curves) {
                expect(curve).toHaveLength(SYNTH_TIMESTAMPS_UTC_MS.length);
                expect(curve.every((value) => Number.isFinite(value) && value > 0)).toBe(true);
            }
            expect(new Set(curves.map((curve) => curve[curve.length - 1])).size).toBe(curves.length);
        }
    });

    test("statistics are bounded by MIN/MAX and ordered P10 >= P50 >= P90 (oil industry convention)", () => {
        for (const vector of SYNTH_VECTORS) {
            const stats = computeSynthStatistics(vector.name);
            for (let i = 0; i < SYNTH_TIMESTAMPS_UTC_MS.length; i++) {
                const { MIN, MAX, MEAN, P10, P50, P90 } = {
                    MIN: stats.MIN[i],
                    MAX: stats.MAX[i],
                    MEAN: stats.MEAN[i],
                    P10: stats.P10[i],
                    P50: stats.P50[i],
                    P90: stats.P90[i],
                };
                for (const value of [MEAN, P10, P50, P90]) {
                    expect(value).toBeGreaterThanOrEqual(MIN);
                    expect(value).toBeLessThanOrEqual(MAX);
                }
                expect(P10).toBeGreaterThanOrEqual(P50);
                expect(P50).toBeGreaterThanOrEqual(P90);
            }
        }
    });

    test("statistics of a realization subset use only that subset", () => {
        const stats = computeSynthStatistics("FOPR", [3]);
        expect(stats.MIN).toEqual(getRealizationValues("FOPR", 3));
        expect(stats.MAX).toEqual(getRealizationValues("FOPR", 3));
    });
});

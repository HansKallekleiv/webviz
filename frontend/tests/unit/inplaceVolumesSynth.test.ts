import { describe, expect, test } from "vitest";

import {
    SYNTH,
    SYNTH_INPLACE,
    SynthInplaceRequestError,
    computeSynthInplacePerRealizationRows,
    computeSynthInplaceStatisticalRows,
} from "../mocks/syntheticField";

const REALIZATIONS = [...SYNTH.realizations];

function sumBy<T>(items: T[], value: (item: T) => number): number {
    return items.reduce((sum, item) => sum + value(item), 0);
}

describe("syntheticField inplace volumes", () => {
    test("two calls give identical output", () => {
        const query = {
            resultNames: ["BULK", "HCPV"],
            groupBy: ["ZONE", "FLUID"],
            realizations: REALIZATIONS,
            filters: [],
        };
        expect(computeSynthInplacePerRealizationRows(query)).toEqual(computeSynthInplacePerRealizationRows(query));
        const statQuery = { resultName: "PORV", groupBy: ["REGION"], realizations: REALIZATIONS, filters: [] };
        expect(computeSynthInplaceStatisticalRows(statQuery)).toEqual(computeSynthInplaceStatisticalRows(statQuery));
    });

    test("volumes are on a plausible scale with BULK > PORV > HCPV", () => {
        const rows = computeSynthInplacePerRealizationRows({
            resultNames: [...SYNTH_INPLACE.resultNames],
            groupBy: ["ZONE", "REGION", "FLUID"],
            realizations: REALIZATIONS,
            filters: [],
        });
        expect(rows).toHaveLength(2 * 2 * 2 * REALIZATIONS.length);
        for (const { values } of rows) {
            expect(values.BULK).toBeGreaterThanOrEqual(1e7);
            expect(values.BULK).toBeLessThanOrEqual(1e8);
            expect(values.PORV / values.BULK).toBeGreaterThanOrEqual(0.18);
            expect(values.PORV / values.BULK).toBeLessThanOrEqual(0.28);
            expect(values.HCPV / values.PORV).toBeGreaterThanOrEqual(0.5);
            expect(values.HCPV / values.PORV).toBeLessThanOrEqual(0.8);
        }
    });

    test("grouped totals sum to the ungrouped total per realization", () => {
        const ungrouped = computeSynthInplacePerRealizationRows({
            resultNames: ["HCPV"],
            groupBy: [],
            realizations: REALIZATIONS,
            filters: [],
        });
        expect(ungrouped).toHaveLength(REALIZATIONS.length);
        expect(ungrouped[0].fluidSelection).toBe("gas + oil");
        expect(ungrouped[0].groupValues).toEqual([]);

        for (const groupBy of [["ZONE"], ["REGION", "ZONE"], ["FLUID"], ["ZONE", "REGION", "FLUID"]]) {
            const grouped = computeSynthInplacePerRealizationRows({
                resultNames: ["HCPV"],
                groupBy,
                realizations: REALIZATIONS,
                filters: [],
            });
            for (const total of ungrouped) {
                const parts = grouped.filter((row) => row.realization === total.realization);
                expect(sumBy(parts, (row) => row.values.HCPV)).toBeCloseTo(total.values.HCPV, 0);
            }
        }
    });

    test("filters restrict the summed cells and the fluid selection", () => {
        const rows = computeSynthInplacePerRealizationRows({
            resultNames: ["BULK"],
            groupBy: ["ZONE"],
            realizations: [0],
            filters: [{ indexColumn: "FLUID", values: ["oil"] }],
        });
        expect(rows.map((row) => row.groupValues)).toEqual([["Upper"], ["Lower"]]);
        expect(rows.every((row) => row.fluidSelection === "oil")).toBe(true);
    });

    test("P10 >= P90 and both lie within [MIN, MAX]", () => {
        for (const resultName of SYNTH_INPLACE.resultNames) {
            const rows = computeSynthInplaceStatisticalRows({
                resultName,
                groupBy: ["ZONE", "REGION", "FLUID"],
                realizations: REALIZATIONS,
                filters: [],
            });
            for (const { statistics } of rows) {
                expect(statistics.p10).toBeGreaterThanOrEqual(statistics.p90);
                expect(statistics.p90).toBeGreaterThanOrEqual(statistics.min);
                expect(statistics.p10).toBeLessThanOrEqual(statistics.max);
                expect(statistics.mean).toBeGreaterThanOrEqual(statistics.min);
                expect(statistics.mean).toBeLessThanOrEqual(statistics.max);
            }
        }
    });

    test("stddev is the sample standard deviation", () => {
        const query = { groupBy: ["ZONE", "REGION", "FLUID"], realizations: [0, 1, 2], filters: [] };
        const values = computeSynthInplacePerRealizationRows({ ...query, resultNames: ["BULK"] })
            .filter((row) => row.groupValues.join() === "Upper,1" && row.fluidSelection === "oil")
            .map((row) => row.values.BULK);
        expect(values).toHaveLength(3);

        const [a, b, c] = values;
        const mean = (a + b + c) / 3;
        const expected = Math.sqrt(((a - mean) ** 2 + (b - mean) ** 2 + (c - mean) ** 2) / 2);

        const row = computeSynthInplaceStatisticalRows({ ...query, resultName: "BULK" }).find(
            (r) => r.groupValues.join() === "Upper,1" && r.fluidSelection === "oil",
        );
        expect(row?.statistics.stddev).toBeCloseTo(expected, 3);
    });

    test("per-realization rows aggregate to the statistical rows", () => {
        const query = { groupBy: ["REGION"], realizations: REALIZATIONS, filters: [] };
        const perRealization = computeSynthInplacePerRealizationRows({ ...query, resultNames: ["PORV"] });
        const statistical = computeSynthInplaceStatisticalRows({ ...query, resultName: "PORV" });
        expect(statistical).toHaveLength(2);

        for (const row of statistical) {
            const values = perRealization
                .filter((r) => r.groupValues.join() === row.groupValues.join())
                .map((r) => r.values.PORV)
                .sort((a, b) => a - b);
            expect(values).toHaveLength(REALIZATIONS.length);
            expect(row.fluidSelection).toBe("gas + oil");
            expect(row.statistics.mean).toBeCloseTo(sumBy(values, (v) => v) / values.length, 3);
            expect(row.statistics.min).toBe(values[0]);
            expect(row.statistics.max).toBe(values[values.length - 1]);
            // 10 values: quantile 0.1 sits at position 0.9, quantile 0.9 at 8.1
            expect(row.statistics.p90).toBeCloseTo(values[0] + 0.9 * (values[1] - values[0]), 3);
            expect(row.statistics.p10).toBeCloseTo(values[8] + 0.1 * (values[9] - values[8]), 3);
        }
    });

    test("unknown result names and indices are rejected", () => {
        const base = { groupBy: [], realizations: REALIZATIONS, filters: [] };
        expect(() => computeSynthInplacePerRealizationRows({ ...base, resultNames: ["STOIIP"] })).toThrow(
            SynthInplaceRequestError,
        );
        expect(() => computeSynthInplaceStatisticalRows({ ...base, resultName: "BULK", groupBy: ["FACIES"] })).toThrow(
            SynthInplaceRequestError,
        );
        expect(() =>
            computeSynthInplaceStatisticalRows({
                ...base,
                resultName: "BULK",
                filters: [{ indexColumn: "ZONE", values: ["Middle"] }],
            }),
        ).toThrow(SynthInplaceRequestError);
    });
});

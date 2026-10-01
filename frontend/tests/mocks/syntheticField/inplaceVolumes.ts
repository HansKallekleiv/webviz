import type { InplaceVolumesIndexWithValues_api } from "@api";

import { hashString, mulberry32 } from "./prng";
import { quantileSorted } from "./timeseries";

export const SYNTH_INPLACE = {
    tableName: "synth_geogrid",
    indices: [
        { indexColumn: "ZONE", values: ["Upper", "Lower"] },
        { indexColumn: "REGION", values: ["1", "2"] },
        { indexColumn: "FLUID", values: ["oil", "gas"] },
    ],
    resultNames: ["BULK", "PORV", "HCPV"],
} as const satisfies {
    tableName: string;
    indices: readonly { indexColumn: string; values: readonly string[] }[];
    resultNames: readonly string[];
};

export type SynthInplaceStatistic = "mean" | "stddev" | "min" | "max" | "p10" | "p90";

/** A request the synthetic table can't answer; handlers turn it into a 400. */
export class SynthInplaceRequestError extends Error {}

type SynthInplaceQuery = {
    groupBy: readonly string[];
    realizations: readonly number[];
    filters: readonly InplaceVolumesIndexWithValues_api[];
};

export type SynthInplacePerRealizationRow = {
    groupValues: string[];
    fluidSelection: string;
    realization: number;
    values: Record<string, number>;
};

export type SynthInplaceStatisticalRow = {
    groupValues: string[];
    fluidSelection: string;
    statistics: Record<SynthInplaceStatistic, number>;
};

const FLUID = "FLUID";
const INDEX_COLUMNS: readonly string[] = SYNTH_INPLACE.indices.map((index) => index.indexColumn);
const RESULT_NAMES: readonly string[] = SYNTH_INPLACE.resultNames;
// Backend selector column order: InplaceVolumes.index_columns()
const BACKEND_INDEX_ORDER = ["FLUID", "ZONE", "REGION", "FACIES", "LICENSE"];

/** Grouped index columns as the backend returns them as selector columns: FLUID excluded, backend order. */
export function getSynthInplaceGroupColumns(groupBy: readonly string[]): string[] {
    return BACKEND_INDEX_ORDER.filter((column) => column !== FLUID && groupBy.includes(column));
}

function getSynthInplaceVolumes(realization: number, cell: Record<string, string>): Record<string, number> {
    const rng = mulberry32(hashString(`INPLACE:${realization}:${cell.ZONE}:${cell.REGION}:${cell.FLUID}`));
    const bulk = 1e7 + rng() * 9e7;
    const poro = 0.18 + rng() * 0.1;
    const sw = 0.2 + rng() * 0.3;
    const porv = bulk * poro;
    return { BULK: bulk, PORV: porv, HCPV: porv * (1 - sw) };
}

function makeCells(filters: readonly InplaceVolumesIndexWithValues_api[]): Record<string, string>[] {
    let cells: Record<string, string>[] = [{}];
    for (const index of SYNTH_INPLACE.indices) {
        const filter = filters.find((f) => f.indexColumn === index.indexColumn);
        const values = index.values.filter((value) => !filter || filter.values.includes(value));
        cells = cells.flatMap((cell) => values.map((value) => ({ ...cell, [index.indexColumn]: value })));
    }
    return cells;
}

function validateQuery(resultNames: readonly string[], query: SynthInplaceQuery): void {
    for (const name of resultNames) {
        if (!RESULT_NAMES.includes(name)) throw new SynthInplaceRequestError(`Unknown result name: ${name}`);
    }
    for (const column of query.groupBy) {
        if (!INDEX_COLUMNS.includes(column)) throw new SynthInplaceRequestError(`Unknown group by index: ${column}`);
    }
    for (const filter of query.filters) {
        const index = SYNTH_INPLACE.indices.find((i) => i.indexColumn === filter.indexColumn);
        if (!index) throw new SynthInplaceRequestError(`Unknown index column: ${filter.indexColumn}`);
        if (filter.values.length === 0 || filter.values.some((v) => !(index.values as readonly string[]).includes(v))) {
            throw new SynthInplaceRequestError(`Invalid values for index column: ${filter.indexColumn}`);
        }
    }
}

/** Volumes per realization, summed over the non-grouped indices; fluids summed unless FLUID is grouped. */
export function computeSynthInplacePerRealizationRows(
    query: SynthInplaceQuery & { resultNames: readonly string[] },
): SynthInplacePerRealizationRow[] {
    validateQuery(query.resultNames, query);
    const resultNames = [...new Set(query.resultNames)];
    const groupColumns = getSynthInplaceGroupColumns(query.groupBy);
    const isGroupedByFluid = query.groupBy.includes(FLUID);
    const cells = makeCells(query.filters);
    // Backend: sorted unique fluids joined with " + "
    const summedFluids = [...new Set(cells.map((cell) => cell.FLUID))].sort().join(" + ");

    const rowsByKey = new Map<string, SynthInplacePerRealizationRow>();
    for (const cell of cells) {
        const fluidSelection = isGroupedByFluid ? cell.FLUID : summedFluids;
        const groupValues = groupColumns.map((column) => cell[column]);
        for (const realization of query.realizations) {
            const key = JSON.stringify([fluidSelection, groupValues, realization]);
            let row = rowsByKey.get(key);
            if (!row) {
                row = {
                    groupValues,
                    fluidSelection,
                    realization,
                    values: Object.fromEntries(resultNames.map((n) => [n, 0])),
                };
                rowsByKey.set(key, row);
            }
            const volumes = getSynthInplaceVolumes(realization, cell);
            for (const name of resultNames) row.values[name] += volumes[name];
        }
    }
    return [...rowsByKey.values()];
}

/** Statistics across realizations per group, with the backend's conventions (inverted P10/P90, sample stddev). */
export function computeSynthInplaceStatisticalRows(
    query: SynthInplaceQuery & { resultName: string },
): SynthInplaceStatisticalRow[] {
    const perRealizationRows = computeSynthInplacePerRealizationRows({ ...query, resultNames: [query.resultName] });

    const valuesByGroup = new Map<string, { groupValues: string[]; fluidSelection: string; values: number[] }>();
    for (const row of perRealizationRows) {
        const key = JSON.stringify([row.fluidSelection, row.groupValues]);
        let group = valuesByGroup.get(key);
        if (!group) {
            group = { groupValues: row.groupValues, fluidSelection: row.fluidSelection, values: [] };
            valuesByGroup.set(key, group);
        }
        group.values.push(row.values[query.resultName]);
    }

    return [...valuesByGroup.values()].map(({ groupValues, fluidSelection, values }) => ({
        groupValues,
        fluidSelection,
        statistics: computeStatistics(values),
    }));
}

function computeStatistics(values: number[]): Record<SynthInplaceStatistic, number> {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    const sumOfSquares = sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0);
    return {
        mean,
        // Polars std(): sample standard deviation (ddof=1), NaN for a single value
        stddev: sorted.length > 1 ? Math.sqrt(sumOfSquares / (sorted.length - 1)) : NaN,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p10: quantileSorted(sorted, 0.9),
        p90: quantileSorted(sorted, 0.1),
    };
}

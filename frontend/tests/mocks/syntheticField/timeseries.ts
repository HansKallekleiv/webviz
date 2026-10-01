import { hashString, mulberry32 } from "./prng";
import { SYNTH } from "./synth";

export type SynthVectorDefinition = {
    name: string;
    descriptiveName: string;
    unit: string;
    isRate: boolean;
};

export const SYNTH_VECTORS: readonly SynthVectorDefinition[] = [
    { name: "FOPR", descriptiveName: "Field oil production rate", unit: "SM3/DAY", isRate: true },
    { name: "FOPT", descriptiveName: "Field oil production total", unit: "SM3", isRate: false },
    { name: "FWPR", descriptiveName: "Field water production rate", unit: "SM3/DAY", isRate: true },
    { name: "WOPR:OP_1", descriptiveName: "Well oil production rate, OP_1", unit: "SM3/DAY", isRate: true },
];

/** Monthly, UTC, 2020-01-01 .. 2022-12-01 */
export const SYNTH_TIMESTAMPS_UTC_MS: readonly number[] = Array.from({ length: 36 }, (_, i) => Date.UTC(2020, i, 1));

export type SynthStatisticName = "MEAN" | "MIN" | "MAX" | "P10" | "P90" | "P50";
export const ALL_SYNTH_STATISTICS: readonly SynthStatisticName[] = ["MEAN", "MIN", "MAX", "P10", "P90", "P50"];

export function findSynthVector(name: string): SynthVectorDefinition | undefined {
    return SYNTH_VECTORS.find((vector) => vector.name === name);
}

const DAY_MS = 24 * 3600 * 1000;
const softplus = (x: number): number => Math.log(1 + Math.exp(x));
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

function makeOilRate(realization: number): number[] {
    const rng = mulberry32(hashString(`FOPR:${realization}`));
    const q0 = 8000 + rng() * 4000;
    const plateauMonths = 6 + rng() * 10;
    const decline = 0.03 + rng() * 0.05;
    return SYNTH_TIMESTAMPS_UTC_MS.map((_, i) => q0 / (1 + decline * softplus(i - plateauMonths)));
}

function makeWaterRate(realization: number): number[] {
    const rng = mulberry32(hashString(`FWPR:${realization}`));
    const w0 = 50 + rng() * 100;
    const wMax = 1500 + rng() * 1500;
    const midMonth = 18 + rng() * 10;
    return SYNTH_TIMESTAMPS_UTC_MS.map((_, i) => w0 + wMax * sigmoid((i - midMonth) / 4));
}

function makeOilTotal(oilRate: number[]): number[] {
    let cumulative = 0;
    return oilRate.map((rate, i) => {
        const nextTimestamp = SYNTH_TIMESTAMPS_UTC_MS[i + 1] ?? Date.UTC(2023, 0, 1);
        const days = (nextTimestamp - SYNTH_TIMESTAMPS_UTC_MS[i]) / DAY_MS;
        cumulative += rate * days;
        return cumulative;
    });
}

function makeWellOilRate(realization: number, fieldOilRate: number[]): number[] {
    const rng = mulberry32(hashString(`WOPR:OP_1:${realization}`));
    const share = 0.35 + rng() * 0.1;
    return fieldOilRate.map((rate) => rate * share);
}

const valuesCache = new Map<string, number[]>();

/** Values per timestamp for one realization. Throws on unknown vector. */
export function getRealizationValues(vectorName: string, realization: number): number[] {
    const key = `${vectorName}:${realization}`;
    const cached = valuesCache.get(key);
    if (cached) return cached;

    let values: number[];
    switch (vectorName) {
        case "FOPR":
            values = makeOilRate(realization);
            break;
        case "FOPT":
            values = makeOilTotal(makeOilRate(realization));
            break;
        case "FWPR":
            values = makeWaterRate(realization);
            break;
        case "WOPR:OP_1":
            values = makeWellOilRate(realization, makeOilRate(realization));
            break;
        default:
            throw new Error(`Unknown synthetic vector: ${vectorName}`);
    }

    valuesCache.set(key, values);
    return values;
}

/** Linear-interpolated quantile of an ascending array (same as the backend's polars `quantile(q, "linear")`). */
export function quantileSorted(sortedValues: number[], q: number): number {
    const position = q * (sortedValues.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower);
}

function computeStatisticAt(sortedValues: number[], statistic: SynthStatisticName): number {
    switch (statistic) {
        case "MIN":
            return sortedValues[0];
        case "MAX":
            return sortedValues[sortedValues.length - 1];
        case "MEAN":
            return sortedValues.reduce((sum, value) => sum + value, 0) / sortedValues.length;
        case "P50":
            return quantileSorted(sortedValues, 0.5);
        // Oil industry convention as in the backend: P10 is the high value, P90 the low value
        case "P10":
            return quantileSorted(sortedValues, 0.9);
        case "P90":
            return quantileSorted(sortedValues, 0.1);
    }
}

/** Statistics across realizations per timestamp, computed from the same values as `getRealizationValues`. */
export function computeSynthStatistics(
    vectorName: string,
    realizations: readonly number[] = SYNTH.realizations,
    statistics: readonly SynthStatisticName[] = ALL_SYNTH_STATISTICS,
): Record<SynthStatisticName, number[]> {
    const perRealization = realizations.map((real) => getRealizationValues(vectorName, real));
    const result = {} as Record<SynthStatisticName, number[]>;

    for (const statistic of statistics) {
        result[statistic] = SYNTH_TIMESTAMPS_UTC_MS.map((_, timeIndex) => {
            const sortedValues = perRealization.map((values) => values[timeIndex]).sort((a, b) => a - b);
            return computeStatisticAt(sortedValues, statistic);
        });
    }

    return result;
}

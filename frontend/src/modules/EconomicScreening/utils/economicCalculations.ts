import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import { IrrStatus } from "@modules/EconomicScreening/typesAndEnums";

export const IRR_LOWER_BOUND = -0.9999;
export const IRR_UPPER_BOUND = 10;
export const IRR_MAX_ITERATIONS = 200;
export const IRR_TOLERANCE = 1e-9;
export const BREAK_EVEN_OIL_VOLUME_TOLERANCE = 1e-9;

export function makeCostLookup(costProfile: CostProfileEntry[]): Map<number, { capex: number; opex: number }> {
    const lookup = new Map<number, { capex: number; opex: number }>();
    for (const entry of costProfile) {
        if (lookup.has(entry.year)) {
            throw new Error(`Duplicate cost year: ${entry.year}`);
        }
        lookup.set(entry.year, { capex: entry.capex, opex: entry.opex });
    }
    return lookup;
}

export type IrrComputationResult = {
    irr: number | null;
    status: IrrStatus;
};

/** An undiscounted cash-flow event at a time measured in years from the valuation date. */
export type TimedCashFlowEvent = {
    time: number;
    value: number;
};

/** Combines events occurring at the same time, drops zero events, and orders them in time. */
export function aggregateCoincidentEvents(events: TimedCashFlowEvent[]): TimedCashFlowEvent[] {
    const eventsByTime = new Map<number, number>();
    for (const event of events) {
        eventsByTime.set(event.time, (eventsByTime.get(event.time) ?? 0) + event.value);
    }
    return Array.from(eventsByTime, ([time, value]) => ({ time, value }))
        .filter((event) => event.value !== 0)
        .sort((first, second) => first.time - second.time);
}

/** Highest rate considered when locating IRR roots (10,000%). */
export const IRR_MAX_RATE = 100;
/** Grid points in ln(1 + rate) used to count roots when the cash flow changes sign more than once. */
const IRR_ROOT_SCAN_POINTS = 300;

/**
 * Sign of NPV shared by every rate, decided without solving, or 0 when it cannot be decided this way.
 * For rates >= 0 discount factors fall over time, so positive running totals from the start keep NPV
 * positive; for negative rates they rise, so positive running totals from the end do. The same holds for
 * negative totals.
 */
function signShownByRunningTotals(values: number[]): number {
    let prefix = 0;
    let prefixSign = 0;
    for (const value of values) {
        prefix += value;
        const sign = Math.sign(prefix);
        if (sign === 0 || (prefixSign !== 0 && sign !== prefixSign)) return 0;
        prefixSign = sign;
    }
    let suffix = 0;
    for (let i = values.length - 1; i >= 0; i--) {
        suffix += values[i];
        if (Math.sign(suffix) !== prefixSign) return 0;
    }
    return prefixSign;
}

function countSignChanges(values: number[]): number {
    let changes = 0;
    let previous = 0;
    for (const value of values) {
        const sign = Math.sign(value);
        if (sign === 0) continue;
        if (previous !== 0 && sign !== previous) changes++;
        previous = sign;
    }
    return changes;
}

/**
 * Sign-preserving NPV as a function of x = ln(1 + rate), scaled so that the largest discount factor is one.
 * Factors are built by multiplying per-gap factors, so long profiles neither overflow nor need a power per event.
 */
function makeNpvSignFunction(events: TimedCashFlowEvent[]): (x: number) => number {
    const count = events.length;
    const values = new Float64Array(count);
    const gapIndex = new Int32Array(count);
    const gapKeys = new Map<number, number>();
    const uniqueGaps: number[] = [];
    for (let i = 0; i < count; i++) {
        values[i] = events[i].value;
        if (i === 0) continue;
        const gap = events[i].time - events[i - 1].time;
        const key = Math.round(gap * 1e9);
        let index = gapKeys.get(key);
        if (index === undefined) {
            index = uniqueGaps.length;
            gapKeys.set(key, index);
            uniqueGaps.push(gap);
        }
        gapIndex[i] = index;
    }
    const gapFactors = new Float64Array(uniqueGaps.length);

    return (x: number) => {
        const magnitude = Math.abs(x);
        for (let u = 0; u < uniqueGaps.length; u++) {
            gapFactors[u] = Math.exp(-uniqueGaps[u] * magnitude);
        }
        let factor = 1;
        if (x >= 0) {
            // Positive rates discount later events most: scale relative to the first event.
            let sum = values[0];
            for (let i = 1; i < count; i++) {
                factor *= gapFactors[gapIndex[i]];
                sum += values[i] * factor;
            }
            return sum;
        }
        // Negative rates weight later events most: scale relative to the last event.
        let sum = values[count - 1];
        for (let i = count - 2; i >= 0; i--) {
            factor *= gapFactors[gapIndex[i + 1]];
            sum += values[i] * factor;
        }
        return sum;
    };
}

/**
 * Finds the investment IRR of the given timed events, or says why there is none.
 *
 * Only events at identical times are combined; coarser netting such as annual totals can hide sign
 * changes. With one change of sign there is exactly one root (Descartes' rule of signs). With more,
 * NPV is scanned over the supported rate range and its zero crossings are counted; roots closer together
 * than one scan step can be missed. An IRR is reported only for an investment-shaped root, where NPV is
 * positive below the rate and negative above it.
 */
export function computeInternalRateOfReturnFromEvents(events: TimedCashFlowEvent[]): IrrComputationResult {
    const aggregatedEvents = aggregateCoincidentEvents(events);
    if (aggregatedEvents.length === 0) {
        return { irr: null, status: IrrStatus.NO_INVESTMENT };
    }

    const cashFlowScale = Math.max(...aggregatedEvents.map((event) => Math.abs(event.value)));
    const normalizedEvents = aggregatedEvents
        .map((event) => ({ ...event, value: event.value / cashFlowScale }))
        .filter((event) => Math.abs(event.value) > 1e-12);
    if (normalizedEvents.length === 0) {
        return { irr: null, status: IrrStatus.NO_INVESTMENT };
    }
    const values = normalizedEvents.map((event) => event.value);
    const signChanges = countSignChanges(values);

    if (signChanges === 0) {
        return { irr: null, status: values[0] > 0 ? IrrStatus.NO_INVESTMENT : IrrStatus.NEVER_RECOVERED };
    }
    if (signChanges === 1) {
        // Income first and costs later is a financing shape, not an investment to recover.
        return values[0] > 0 ? { irr: null, status: IrrStatus.NO_INVESTMENT } : solveConventional(normalizedEvents);
    }

    const sharedSign = signShownByRunningTotals(values);
    if (sharedSign !== 0) {
        return { irr: null, status: sharedSign > 0 ? IrrStatus.NO_INVESTMENT : IrrStatus.NEVER_RECOVERED };
    }

    const npvSign = makeNpvSignFunction(normalizedEvents);
    const lowX = Math.log1p(IRR_LOWER_BOUND);
    const highX = Math.log1p(IRR_MAX_RATE);
    const step = (highX - lowX) / (IRR_ROOT_SCAN_POINTS - 1);
    const crossings: [number, number][] = [];
    let previousX = lowX;
    let previousSign = Math.sign(npvSign(lowX));
    let firstSign = previousSign;
    for (let i = 1; i < IRR_ROOT_SCAN_POINTS; i++) {
        const x = lowX + i * step;
        const sign = Math.sign(npvSign(x));
        if (sign === 0) continue;
        if (firstSign === 0) firstSign = sign;
        if (previousSign !== 0 && sign !== previousSign) {
            crossings.push([previousX, x]);
            if (crossings.length > 1) break;
        }
        previousSign = sign;
        previousX = x;
    }

    if (crossings.length === 0) {
        return { irr: null, status: firstSign < 0 ? IrrStatus.NEVER_RECOVERED : IrrStatus.NO_INVESTMENT };
    }
    if (crossings.length > 1) {
        return { irr: null, status: IrrStatus.MULTIPLE_ROOTS };
    }
    if (firstSign < 0) {
        return { irr: null, status: IrrStatus.NO_INVESTMENT };
    }

    let [low, high] = crossings[0];
    for (let i = 0; i < IRR_MAX_ITERATIONS && Math.expm1(high) - Math.expm1(low) > IRR_TOLERANCE; i++) {
        const mid = (low + high) / 2;
        if (Math.sign(npvSign(mid)) === firstSign) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return { irr: Math.expm1((low + high) / 2), status: IrrStatus.CONVERGED };
}

/** One change of sign from outflows to inflows: exactly one root, found by bracketed bisection. */
function solveConventional(normalizedEvents: TimedCashFlowEvent[]): IrrComputationResult {
    const firstEventTime = normalizedEvents[0].time;
    const residualTolerance = 1e-12;
    const npvAtRate = (rate: number): number => {
        return normalizedEvents.reduce(
            (sum, event) => sum + event.value / Math.pow(1 + rate, event.time - firstEventTime),
            0,
        );
    };
    const npvSignAtRate = (rate: number): number => {
        const logarithm = Math.log1p(rate);
        const exponents = normalizedEvents.map((event) => -(event.time - firstEventTime) * logarithm);
        const largestExponent = Math.max(...exponents);
        return normalizedEvents.reduce(
            (sum, event, index) => sum + event.value * Math.exp(exponents[index] - largestExponent),
            0,
        );
    };

    let low = IRR_LOWER_BOUND;
    let high = IRR_UPPER_BOUND;
    const npvLow = npvAtRate(low);
    const npvHigh = npvAtRate(high);

    const npvLowSign = Number.isFinite(npvLow) ? npvLow : npvSignAtRate(low);
    const npvHighSign = Number.isFinite(npvHigh) ? npvHigh : npvSignAtRate(high);

    if (Number.isFinite(npvLow) && Math.abs(npvLow) < residualTolerance)
        return { irr: low, status: IrrStatus.CONVERGED };
    if (Number.isFinite(npvHigh) && Math.abs(npvHigh) < residualTolerance)
        return { irr: high, status: IrrStatus.CONVERGED };

    if (npvLowSign * npvHighSign > 0) {
        // Try bracket expansion upwards up to IRR_MAX_RATE (10,000%)
        let expanded = false;
        let testHigh = high;
        while (testHigh < IRR_MAX_RATE) {
            testHigh *= 2;
            const npvTest = npvAtRate(testHigh);
            const npvTestSign = Number.isFinite(npvTest) ? npvTest : npvSignAtRate(testHigh);
            if (npvLowSign * npvTestSign <= 0) {
                high = testHigh;
                expanded = true;
                break;
            }
        }
        if (!expanded) {
            return { irr: null, status: IrrStatus.OUT_OF_DOMAIN };
        }
    }

    for (let i = 0; i < IRR_MAX_ITERATIONS; i++) {
        const mid = (low + high) / 2;
        const npvMid = npvAtRate(mid);
        if ((Number.isFinite(npvMid) && Math.abs(npvMid) < residualTolerance) || high - low < IRR_TOLERANCE) {
            return { irr: mid, status: IrrStatus.CONVERGED };
        }
        const npvMidSign = Number.isFinite(npvMid) ? npvMid : npvSignAtRate(mid);
        if (npvLowSign * npvMidSign < 0) {
            high = mid;
        } else {
            low = mid;
        }
    }

    return { irr: (low + high) / 2, status: IrrStatus.CONVERGED };
}

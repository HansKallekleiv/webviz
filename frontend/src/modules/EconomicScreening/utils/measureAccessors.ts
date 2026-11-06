import { simulationUnitReformat } from "@modules/_shared/reservoirSimulationStringUtils";
import type { CommonNumberScale } from "@modules/_shared/utils/numberFormatting";
import {
    formatCommonScaleUnit,
    formatWithCommonScale,
    makeCommonNumberScale,
} from "@modules/_shared/utils/numberFormatting";
import {
    CURRENCY,
    EconomicMeasure,
    IrrStatus,
    EconomicMeasureEnumToStringMapping,
    OIL_PRICE_UNIT,
} from "@modules/EconomicScreening/typesAndEnums";

import {
    getIneligibilityMessage,
    getMeasureRequirement,
    Ineligibility,
    MeasureRequirement,
    REQUIREMENT_NEEDS,
} from "./eligibility";
import type { MonthlyRealizationEconomicResult } from "./monthlyEconomics";
import { convertOilPriceFromSimulatorUnit } from "./unitConversion";

export type MeasureValues = {
    realizations: number[];
    values: number[];
};

/** A common scale for a set of values, with the prefixed unit label. */
export type MeasureDisplayScale = CommonNumberScale & {
    unit: string;
};

/** Simulator volume units of the source vectors. */
export type MeasureUnitContext = {
    oilUnit: string;
    gasUnit: string;
};

/** Measures withheld by an invalid cost draft: NPV, IRR and break-even oil price. */
export function isFinancialMeasure(measure: EconomicMeasure): boolean {
    return REQUIREMENT_NEEDS[getMeasureRequirement(measure)].validCostDraft;
}

function rawMeasureValue(
    result: MonthlyRealizationEconomicResult,
    measure: EconomicMeasure,
    context: MeasureUnitContext,
): number | null {
    switch (measure) {
        case EconomicMeasure.NPV:
            return result.npv;
        case EconomicMeasure.IRR:
            // Reported in percent so the channel and axis read naturally.
            return result.irr === null ? null : result.irr * 100;
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return result.breakEvenOilPrice === null
                ? null
                : convertOilPriceFromSimulatorUnit(result.breakEvenOilPrice, context.oilUnit);
        case EconomicMeasure.DISCOUNTED_OIL_VOLUME:
            return result.hasOilData ? result.discountedOilVolume : null;
        case EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME:
            return result.hasSalesGasData ? result.discountedSalesGasVolume : null;
        case EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS:
            return result.hasOilData && result.hasSalesGasData ? result.discountedOilEquivalents : null;
        default:
            return null;
    }
}

/** Realizations where the measure is undefined, e.g. IRR without a sign change, are left out. */
export function getMeasureValues(
    results: MonthlyRealizationEconomicResult[],
    measure: EconomicMeasure,
    context: MeasureUnitContext,
): MeasureValues {
    const realizations: number[] = [];
    const values: number[] = [];

    for (const result of results) {
        const value = rawMeasureValue(result, measure, context);
        if (value === null || !Number.isFinite(value)) {
            continue;
        }
        realizations.push(result.realization);
        values.push(value);
    }

    return { realizations, values };
}

export function getMeasureUnit(measure: EconomicMeasure, context: MeasureUnitContext): string {
    const oilUnit = context.oilUnit ? simulationUnitReformat(context.oilUnit) : "";
    const gasUnit = context.gasUnit ? simulationUnitReformat(context.gasUnit) : "";

    switch (measure) {
        case EconomicMeasure.NPV:
            return CURRENCY;
        case EconomicMeasure.IRR:
            return "%";
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return OIL_PRICE_UNIT;
        case EconomicMeasure.DISCOUNTED_OIL_VOLUME:
        case EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS:
            return oilUnit;
        case EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME:
            return gasUnit;
        default:
            return "";
    }
}

export function getMeasureDisplayScale(measure: EconomicMeasure, values: number[], unit: string): MeasureDisplayScale {
    const isMoney = measure === EconomicMeasure.NPV || measure === EconomicMeasure.BREAK_EVEN_OIL_PRICE;
    return makeDisplayScale(values, unit, isMoney);
}

/** Money reads as "million USD", volumes and other units as SI prefixes, e.g. "MSm³". */
export function makeDisplayScale(values: number[], unit: string, isMoney: boolean): MeasureDisplayScale {
    const scale = makeCommonNumberScale(values, { style: isMoney ? "words" : "si" });
    return { ...scale, unit: formatCommonScaleUnit(scale, unit) };
}

export function formatMeasureValue(value: number, displayScale: MeasureDisplayScale): string {
    return formatWithCommonScale(value, displayScale);
}

export function getMeasureDisplayName(measure: EconomicMeasure, isDelta = false): string {
    if (!isDelta) {
        return EconomicMeasureEnumToStringMapping[measure];
    }
    switch (measure) {
        case EconomicMeasure.NPV:
            return "Incremental net present value";
        case EconomicMeasure.IRR:
            return "Incremental internal rate of return";
        case EconomicMeasure.BREAK_EVEN_OIL_PRICE:
            return "Incremental break-even oil price";
        default:
            return EconomicMeasureEnumToStringMapping[measure];
    }
}

/** Ties go to the reason seen first. */
function mostCommonReason(reasons: (Ineligibility | null)[]): Ineligibility | null {
    const counts = new Map<Ineligibility, number>();
    let mostCommon: Ineligibility | null = null;
    for (const reason of reasons) {
        if (reason === null) {
            continue;
        }
        const count = (counts.get(reason) ?? 0) + 1;
        counts.set(reason, count);
        if (mostCommon === null || count > counts.get(mostCommon)!) {
            mostCommon = reason;
        }
    }
    return mostCommon;
}

function measureIneligibility(
    result: MonthlyRealizationEconomicResult,
    measure: EconomicMeasure,
): Ineligibility | null {
    const oilCoverage = result.hasOilData ? null : Ineligibility.OIL_COVERAGE;
    const gasCoverage = result.hasSalesGasData ? null : Ineligibility.GAS_COVERAGE;
    switch (getMeasureRequirement(measure)) {
        case MeasureRequirement.FINANCIAL:
            return result.financialIneligibility;
        case MeasureRequirement.BREAK_EVEN:
            return result.breakEvenIneligibility;
        case MeasureRequirement.OIL_VOLUME:
            return oilCoverage;
        case MeasureRequirement.GAS_VOLUME:
            return gasCoverage;
        case MeasureRequirement.OIL_AND_GAS_VOLUME:
            return oilCoverage ?? gasCoverage;
    }
}

/** The most common reason over the given realizations, or the IRR solver status when IRR was calculated. */
export function getMeasureUnavailableReason(
    results: MonthlyRealizationEconomicResult[],
    measure: EconomicMeasure,
): string {
    const reason = mostCommonReason(results.map((result) => measureIneligibility(result, measure)));
    if (reason !== null) {
        return getIneligibilityMessage(reason);
    }
    if (measure === EconomicMeasure.IRR) {
        const summary = getIrrUnavailableSummary(results);
        if (summary) return summary.message;
    }
    return "No valid values are available for this metric.";
}

export const IRR_STATUS_MESSAGES: Record<Exclude<IrrStatus, IrrStatus.CONVERGED>, string> = {
    [IrrStatus.NO_INVESTMENT]: "Income covers costs from the start, so there's no investment to recover.",
    [IrrStatus.NEVER_RECOVERED]: "Income never covers the costs, so the investment is never recovered.",
    [IrrStatus.MULTIPLE_ROOTS]: "More than one rate makes NPV zero, so no IRR is shown.",
    [IrrStatus.OUT_OF_DOMAIN]: "IRR could not be calculated within the supported rate range.",
};

/**
 * Among realizations with a calculated cash flow but no IRR: how many, and the most common reason.
 * Null when every such realization has an IRR.
 */
export function getIrrUnavailableSummary(
    results: MonthlyRealizationEconomicResult[],
): { count: number; message: string } | null {
    const counts = new Map<Exclude<IrrStatus, IrrStatus.CONVERGED>, number>();
    for (const result of results) {
        const status = result.irrStatus;
        if (status === undefined || status === IrrStatus.CONVERGED) continue;
        counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    let mostCommon: Exclude<IrrStatus, IrrStatus.CONVERGED> | null = null;
    let total = 0;
    for (const [status, count] of counts) {
        total += count;
        if (mostCommon === null || count > counts.get(mostCommon)!) mostCommon = status;
    }
    return mostCommon === null ? null : { count: total, message: IRR_STATUS_MESSAGES[mostCommon] };
}

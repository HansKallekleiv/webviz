import type { ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";

import { EconomicMeasure } from "./typesAndEnums";
import type { MeasureUnitContext } from "./utils/measureAccessors";
import { getMeasureDisplayName, getMeasureUnit, getMeasureValues } from "./utils/measureAccessors";
import type { MonthlyRealizationEconomicResult } from "./utils/monthlyEconomics";

/** The inputs that can differ between published channels; null leaves an input out of the label. */
export type ChannelContext = {
    discountRatePercent: number | null;
    predictionStartYear: number | null;
};

const NO_CHANNEL_CONTEXT: ChannelContext = { discountRatePercent: null, predictionStartYear: null };

const SHORT_MEASURE_NAMES: Partial<Record<EconomicMeasure, string>> = {
    [EconomicMeasure.NPV]: "NPV",
    [EconomicMeasure.IRR]: "IRR",
};

/**
 * A short channel label: the measure, the ensemble and only the inputs that change the value. Fixed module
 * conventions, the currency (in the unit) and the evaluation end (the simulation end) are left out.
 *   makeChannelDisplayString("NPV", "iter-0", { discountRatePercent: 8, predictionStartYear: 2019 }, true)
 *   → "NPV (iter-0; 8%, from 2019)"
 */
export function makeChannelDisplayString(
    measureLabel: string,
    ensembleDisplayName: string,
    context: ChannelContext,
    usesDiscountRate: boolean,
): string {
    const inputs = [
        usesDiscountRate && context.discountRatePercent !== null ? `${context.discountRatePercent}%` : null,
        context.predictionStartYear !== null ? `from ${context.predictionStartYear}` : null,
    ].filter((input): input is string => input !== null);
    const details = [ensembleDisplayName, inputs.join(", ")].filter((detail) => detail !== "");
    return details.length > 0 ? `${measureLabel} (${details.join("; ")})` : measureLabel;
}

export function makeMeasureDataGenerator(
    results: MonthlyRealizationEconomicResult[],
    measure: EconomicMeasure,
    unitContext: MeasureUnitContext,
    ensembleIdentString: string,
    ensembleDisplayName: string,
    preferredColor: string,
    channelContext: ChannelContext = NO_CHANNEL_CONTEXT,
): DataGenerator {
    return () => {
        const { realizations, values } = getMeasureValues(results, measure, unitContext);

        const metaData: ChannelContentMetaData = {
            unit: getMeasureUnit(measure, unitContext),
            ensembleIdentString,
            displayString: makeChannelDisplayString(
                SHORT_MEASURE_NAMES[measure] ?? getMeasureDisplayName(measure),
                ensembleDisplayName,
                channelContext,
                // IRR is the only measure that does not depend on the discount rate.
                measure !== EconomicMeasure.IRR,
            ),
            preferredColor,
        };

        return {
            data: realizations.map((realization, i) => ({ key: realization, value: values[i] })),
            metaData,
        };
    };
}

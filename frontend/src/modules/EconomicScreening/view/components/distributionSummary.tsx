import { ContentInfo } from "@modules/_shared/components/ContentMessage";
import { EconomicMeasure } from "@modules/EconomicScreening/typesAndEnums";
import type { BreakEvenTargetCount } from "@modules/EconomicScreening/utils/distributionAggregation";
import { countValuesAboveThreshold } from "@modules/EconomicScreening/utils/distributionAggregation";
import type { MeasureValues } from "@modules/EconomicScreening/utils/measureAccessors";
import {
    getIrrUnavailableSummary,
    getMeasureUnavailableReason,
} from "@modules/EconomicScreening/utils/measureAccessors";
import type { MonthlyRealizationEconomicResult } from "@modules/EconomicScreening/utils/monthlyEconomics";

export type DistributionSummaryProps = {
    measure: EconomicMeasure;
    measureValues: MeasureValues;
    results: MonthlyRealizationEconomicResult[];
    breakEvenTargetCount: BreakEvenTargetCount | null;
};

/** Counts that go with the distribution plot; the statistics themselves are drawn in the plot. */
export function DistributionSummary(props: DistributionSummaryProps): React.ReactNode {
    const validCount = props.measureValues.values.length;
    if (validCount === 0) {
        // Shown like the view's other "nothing to plot yet" messages, not as a footnote to an empty plot.
        return (
            <div className="min-h-0 grow">
                <ContentInfo>{getMeasureUnavailableReason(props.results, props.measure)}</ContentInfo>
            </div>
        );
    }

    const irrUnavailable = props.measure === EconomicMeasure.IRR ? getIrrUnavailableSummary(props.results) : null;
    const positiveNpvCount =
        props.measure === EconomicMeasure.NPV ? countValuesAboveThreshold(props.measureValues.values, 0) : null;

    return (
        <div className="gap-x-sm text-body-xs text-subtle flex flex-wrap">
            <span title={`${validCount} valid of ${props.results.length} selected realizations`}>
                Valid realizations: {validCount}/{props.results.length}
            </span>
            {positiveNpvCount && (
                <span title="Fraction of valid realizations with NPV strictly above zero; this is not a probability of commercial success.">
                    Positive NPV: {positiveNpvCount.countAbove}/{positiveNpvCount.validCount}
                </span>
            )}
            {irrUnavailable && (
                <span>
                    IRR unavailable for {irrUnavailable.count} of {props.results.length} realizations:{" "}
                    {irrUnavailable.message}
                </span>
            )}
            {props.measure === EconomicMeasure.BREAK_EVEN_OIL_PRICE && props.breakEvenTargetCount && (
                <span>
                    Positive NPV at target price: {props.breakEvenTargetCount.positiveCount}/
                    {props.breakEvenTargetCount.validCount}
                </span>
            )}
        </div>
    );
}

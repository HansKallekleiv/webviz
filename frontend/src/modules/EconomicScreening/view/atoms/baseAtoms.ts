import { atom } from "jotai";

import type { CostProfileEntry, EconomicAssumptions, PriceAssumptions } from "@modules/EconomicScreening/typesAndEnums";
import {
    DEFAULT_DISCOUNT_RATE_PERCENT,
    CashFlowProfileType,
    CostDraftStatus,
    DistributionPlotType,
    EconomicMeasure,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";
import type { EvaluationHorizonState } from "@modules/EconomicScreening/utils/evaluationHorizon";
import { EMPTY_SOURCE_SNAPSHOT, type EconomicSourceSnapshot } from "@modules/EconomicScreening/utils/sourceSnapshot";

/** Read-only mirrors of the settings-to-view interface, written only by the interface effects. */
export const sourceSnapshotAtom = atom<EconomicSourceSnapshot>(EMPTY_SOURCE_SNAPSHOT);
export const evaluationHorizonAtom = atom<EvaluationHorizonState>({ status: "NO_START" });
export const realizationNumbersAtom = atom<number[] | null>(null);
export const constituentGasConsumptionWarningAtom = atom<string | null>(null);

export const economicAssumptionsAtom = atom<EconomicAssumptions>({
    discountRatePercent: DEFAULT_DISCOUNT_RATE_PERCENT,
});

export const priceAssumptionsAtom = atom<PriceAssumptions>({
    oilPrice: null,
    gasPrice: null,
});

export const costProfileAtom = atom<CostProfileEntry[]>([]);
export const costDraftStatusAtom = atom<CostDraftStatus>(CostDraftStatus.COMMITTED);

export const resultModeAtom = atom<ResultMode>(ResultMode.DISTRIBUTION);
export const selectedMeasureAtom = atom<EconomicMeasure>(EconomicMeasure.DISCOUNTED_OIL_VOLUME);
export const distributionPlotTypeAtom = atom<DistributionPlotType>(DistributionPlotType.EXCEEDANCE);
export const cashFlowProfileTypeAtom = atom<CashFlowProfileType>(CashFlowProfileType.ANNUAL_OIL_VOLUME);
export const selectedRealizationAtom = atom<number | null>(null);

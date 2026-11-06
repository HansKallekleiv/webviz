import { atom } from "jotai";

import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import {
    DEFAULT_DISCOUNT_RATE_PERCENT,
    CashFlowProfileType,
    CostDraftStatus,
    DistributionPlotType,
    EconomicMeasure,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";

export const discountRatePercentAtom = atom<number>(DEFAULT_DISCOUNT_RATE_PERCENT);
export const predictionStartYearAtom = atom<number | null>(null);

export const oilPriceAtom = atom<number | null>(null);
export const gasPriceAtom = atom<number | null>(null);

export const costProfileAtom = atom<CostProfileEntry[]>([]);
export const costDraftStatusAtom = atom<CostDraftStatus>(CostDraftStatus.COMMITTED);
export const stopOpexAfterLastProductionAtom = atom<boolean>(false);

export const resultModeAtom = atom<ResultMode>(ResultMode.DISTRIBUTION);
export const selectedMeasureAtom = atom<EconomicMeasure>(EconomicMeasure.DISCOUNTED_OIL_VOLUME);
export const distributionPlotTypeAtom = atom<DistributionPlotType>(DistributionPlotType.EXCEEDANCE);
export const cashFlowProfileTypeAtom = atom<CashFlowProfileType>(CashFlowProfileType.ANNUAL_OIL_VOLUME);

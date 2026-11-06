import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    costDraftStatusAtom,
    costProfileAtom,
    cashFlowProfileTypeAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    gasPriceAtom,
    oilPriceAtom,
    resultModeAtom,
    selectedMeasureAtom,
    stopOpexAfterLastProductionAtom,
} from "./settings/atoms/baseAtoms";
import { displayedRealizationAtom } from "./settings/atoms/derivedAtoms";
import { validRealizationNumbersAtom } from "./settings/atoms/sourceQueryAtoms";
import {
    constituentGasConsumptionWarningAtom,
    evaluationHorizonStateAtom,
    sourceSnapshotAtom,
} from "./settings/atoms/sourceSnapshotAtoms";
import type {
    CostDraftStatus,
    CostProfileEntry,
    CashFlowProfileType,
    DistributionPlotType,
    EconomicAssumptions,
    EconomicMeasure,
    PriceAssumptions,
    ResultMode,
} from "./typesAndEnums";
import type { EvaluationHorizonState } from "./utils/evaluationHorizon";
import type { EconomicSourceSnapshot } from "./utils/sourceSnapshot";

export type SettingsToViewInterface = {
    sourceSnapshot: EconomicSourceSnapshot;
    evaluationHorizon: EvaluationHorizonState;
    /** Filtered realizations of the snapshot's ensemble; results are calculated for these only. */
    realizationNumbers: number[] | null;
    constituentGasConsumptionWarning: string | null;
    economicAssumptions: EconomicAssumptions;
    priceAssumptions: PriceAssumptions;
    costProfile: CostProfileEntry[];
    costDraftStatus: CostDraftStatus;
    resultMode: ResultMode;
    selectedMeasure: EconomicMeasure;
    distributionPlotType: DistributionPlotType;
    cashFlowProfileType: CashFlowProfileType;
    /** Highlighted realization, or null for Aggregate. */
    selectedRealization: number | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    sourceSnapshot: (get) => {
        return get(sourceSnapshotAtom);
    },
    evaluationHorizon: (get) => {
        return get(evaluationHorizonStateAtom);
    },
    realizationNumbers: (get) => {
        return get(validRealizationNumbersAtom);
    },
    constituentGasConsumptionWarning: (get) => {
        return get(constituentGasConsumptionWarningAtom);
    },
    economicAssumptions: (get) => {
        return {
            discountRatePercent: get(discountRatePercentAtom),
            stopOpexAfterLastProduction: get(stopOpexAfterLastProductionAtom),
        };
    },
    priceAssumptions: (get) => {
        return {
            oilPrice: get(oilPriceAtom),
            gasPrice: get(gasPriceAtom),
        };
    },
    costProfile: (get) => {
        return get(costProfileAtom);
    },
    costDraftStatus: (get) => {
        return get(costDraftStatusAtom);
    },
    resultMode: (get) => {
        return get(resultModeAtom);
    },
    selectedMeasure: (get) => {
        return get(selectedMeasureAtom);
    },
    distributionPlotType: (get) => {
        return get(distributionPlotTypeAtom);
    },
    cashFlowProfileType: (get) => {
        return get(cashFlowProfileTypeAtom);
    },
    selectedRealization: (get) => {
        return get(displayedRealizationAtom);
    },
};

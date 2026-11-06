import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { getEnsembleIdentFromString } from "@framework/utils/ensembleIdentUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import type { CostProfileEntry } from "@modules/EconomicScreening/typesAndEnums";
import {
    CashFlowProfileType,
    DistributionPlotType,
    EconomicMeasure,
    ResultMode,
} from "@modules/EconomicScreening/typesAndEnums";

import {
    costProfileAtom,
    cashFlowProfileTypeAtom,
    discountRatePercentAtom,
    distributionPlotTypeAtom,
    gasPriceAtom,
    oilPriceAtom,
    predictionStartYearAtom,
    resultModeAtom,
    selectedMeasureAtom,
} from "./atoms/baseAtoms";
import { displayedRealizationAtom } from "./atoms/derivedAtoms";
import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "./atoms/persistableFixableAtoms";

/**
 * Only the current model is persisted. Earlier experimental states lack this marker and fail schema
 * validation, so the framework discards them before any setting is changed.
 */
export const SETTINGS_STATE_FORMAT = "MONTHLY_SETTINGS_OWNED_V2";

export type SerializedSettings = {
    stateFormat: typeof SETTINGS_STATE_FORMAT;
    selectedEnsembleIdentString: string | null;
    discountRatePercent: number;
    predictionStartYear: number | null;
    oilPrice: number | null;
    gasPrice: number | null;
    costProfile: CostProfileEntry[];
    resultMode: ResultMode;
    selectedMeasure: EconomicMeasure;
    distributionPlotType: DistributionPlotType;
    cashFlowProfileType: CashFlowProfileType;
    /** Null means Aggregate. */
    selectedRealization: number | null;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        stateFormat: { enum: [SETTINGS_STATE_FORMAT] },
        selectedEnsembleIdentString: { type: "string", nullable: true },
        discountRatePercent: { type: "float64" },
        predictionStartYear: { type: "int32", nullable: true },
        oilPrice: { type: "float64", nullable: true },
        gasPrice: { type: "float64", nullable: true },
        costProfile: {
            elements: {
                properties: {
                    year: { type: "int32" },
                    capex: { type: "float64" },
                    opex: { type: "float64" },
                },
            },
        },
        resultMode: { enum: Object.values(ResultMode) },
        selectedMeasure: { enum: Object.values(EconomicMeasure) },
        distributionPlotType: { enum: Object.values(DistributionPlotType) },
        cashFlowProfileType: { enum: Object.values(CashFlowProfileType) },
        selectedRealization: { type: "int32", nullable: true },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        stateFormat: SETTINGS_STATE_FORMAT,
        selectedEnsembleIdentString: get(selectedEnsembleIdentAtom).value?.toString() ?? null,
        discountRatePercent: get(discountRatePercentAtom),
        predictionStartYear: get(predictionStartYearAtom),
        oilPrice: get(oilPriceAtom),
        gasPrice: get(gasPriceAtom),
        costProfile: get(costProfileAtom),
        resultMode: get(resultModeAtom),
        selectedMeasure: get(selectedMeasureAtom),
        distributionPlotType: get(distributionPlotTypeAtom),
        cashFlowProfileType: get(cashFlowProfileTypeAtom),
        // The displayed choice, so a selection that is invalid here is saved as Aggregate.
        selectedRealization: get(displayedRealizationAtom),
    };
};

/**
 * Receives schema-validated current states, or partial template states. An omitted field leaves the
 * setting unchanged; an explicit null is applied as a reset.
 */
export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const selectedEnsembleIdent =
        raw.selectedEnsembleIdentString === null
            ? null
            : raw.selectedEnsembleIdentString
              ? (getEnsembleIdentFromString(raw.selectedEnsembleIdentString) ?? undefined)
              : undefined;
    const selectedRealization =
        raw.selectedRealization === undefined
            ? undefined
            : { ensembleIdentString: raw.selectedEnsembleIdentString ?? null, realization: raw.selectedRealization };

    setIfDefined(set, selectedEnsembleIdentAtom, selectedEnsembleIdent);
    setIfDefined(set, discountRatePercentAtom, raw.discountRatePercent);
    setIfDefined(set, predictionStartYearAtom, raw.predictionStartYear);
    setIfDefined(set, oilPriceAtom, raw.oilPrice);
    setIfDefined(set, gasPriceAtom, raw.gasPrice);
    setIfDefined(set, costProfileAtom, raw.costProfile);
    setIfDefined(set, resultModeAtom, raw.resultMode);
    setIfDefined(set, selectedMeasureAtom, raw.selectedMeasure);
    setIfDefined(set, distributionPlotTypeAtom, raw.distributionPlotType);
    setIfDefined(set, cashFlowProfileTypeAtom, raw.cashFlowProfileType);
    setIfDefined(set, selectedRealizationAtom, selectedRealization);
};

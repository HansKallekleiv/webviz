import { atom } from "jotai";

import {
    resolveEvaluationHorizon,
    type EvaluationHorizonState,
} from "@modules/EconomicScreening/utils/evaluationHorizon";
import {
    computeMonthlyVolumesFromCumulative,
    lastSupportedMonthIndex,
    monthIndexOf,
    SourceKind,
} from "@modules/EconomicScreening/utils/monthlyProduction";
import type { MonthlyProductionProfile } from "@modules/EconomicScreening/utils/monthlyProduction";
import {
    suggestPredictionStartYears,
    summarizeSelectedProductSupport,
    type SelectedProductSupport,
} from "@modules/EconomicScreening/utils/setupReadiness";
import {
    NO_SALES_GAS_DIAGNOSTICS,
    SourceStatus,
    type EconomicSourceSnapshot,
    type RealizationProfiles,
    type SalesGasDiagnostics,
} from "@modules/EconomicScreening/utils/sourceSnapshot";
import type { RealizationCumulativeSeries } from "@modules/EconomicScreening/utils/vectorResolution";
import {
    deriveSalesGasCumulative,
    isCumulativeVectorAllZero,
    makeZeroCumulativeSeries,
    summarizeCumulativeVectorTerminals,
    toRealizationCumulativeSeries,
} from "@modules/EconomicScreening/utils/vectorResolution";

import { predictionStartYearAtom } from "./baseAtoms";
import { activeVectorListQueryAtom, isSelectedEnsembleDeltaAtom, salesGasStrategyAtom } from "./derivedAtoms";
import { validSelectedEnsembleIdentAtom } from "./persistableFixableAtoms";
import {
    deltaConstituentGasConsumptionQueriesAtom,
    isVectorNeededAtom,
    validRealizationNumbersAtom,
    vectorDataQueriesAtom,
    VectorQueryIndex,
} from "./sourceQueryAtoms";

/** Zero volume is zero in any unit; Sm³ matches the gas price unit. */
const ZERO_SALES_GAS_UNIT = "SM3";

type SalesGasData = {
    series: RealizationCumulativeSeries[];
    unit: string;
    diagnostics: SalesGasDiagnostics;
};

const isFetchingAtom = atom<boolean>((get) => {
    return get(activeVectorListQueryAtom).isLoading || get(vectorDataQueriesAtom).some((query) => query.isFetching);
});

const queryErrorAtom = atom<string | null>((get) => {
    if (get(activeVectorListQueryAtom).isError) {
        return "Could not load the vector list.";
    }
    const queries = get(vectorDataQueriesAtom);
    const failedVectorNames: string[] = [];
    if (queries[VectorQueryIndex.OIL_PRODUCTION].isError) failedVectorNames.push("FOPT");
    if (queries[VectorQueryIndex.SALES_GAS].isError) failedVectorNames.push("FGST");
    if (queries[VectorQueryIndex.GAS_PRODUCTION].isError) failedVectorNames.push("FGPT");
    if (queries[VectorQueryIndex.GAS_INJECTION].isError) failedVectorNames.push("FGIT");
    if (queries[VectorQueryIndex.GAS_CONSUMPTION].isError) failedVectorNames.push("FGCT");

    if (failedVectorNames.length === 0) {
        return null;
    }
    return `Could not load vector data for ${failedVectorNames.join(", ")}.`;
});

/** Pending or failed requests never count as loaded. */
const sourceStatusAtom = atom<SourceStatus>((get) => {
    if (!get(validSelectedEnsembleIdentAtom)) {
        return SourceStatus.NO_ENSEMBLE;
    }
    const vectorListQuery = get(activeVectorListQueryAtom);
    if (vectorListQuery.isError) {
        return SourceStatus.ERROR;
    }
    if (!vectorListQuery.isSuccess) {
        return SourceStatus.LOADING;
    }
    const queries = get(vectorDataQueriesAtom);
    const isVectorNeeded = get(isVectorNeededAtom);
    if (!isVectorNeeded.some(Boolean)) {
        return SourceStatus.NO_SOURCES;
    }
    if (queries.some((query, index) => isVectorNeeded[index] && query.isError)) {
        return SourceStatus.ERROR;
    }
    if (queries.some((query, index) => isVectorNeeded[index] && !query.isSuccess)) {
        return SourceStatus.LOADING;
    }
    return SourceStatus.READY;
});

const sourceKindAtom = atom<SourceKind>((get) => {
    return get(isSelectedEnsembleDeltaAtom) ? SourceKind.DELTA : SourceKind.REGULAR;
});

const oilProductionSeriesAtom = atom<RealizationCumulativeSeries[]>((get) => {
    const data = get(vectorDataQueriesAtom)[VectorQueryIndex.OIL_PRODUCTION].data ?? [];
    return toRealizationCumulativeSeries(data, get(sourceKindAtom));
});

const salesGasDataAtom = atom<SalesGasData>((get) => {
    const salesGasStrategy = get(salesGasStrategyAtom);
    const queries = get(vectorDataQueriesAtom);
    const sourceKind = get(sourceKindAtom);

    if (salesGasStrategy.kind === "DIRECT") {
        const data = queries[VectorQueryIndex.SALES_GAS].data ?? [];
        const gasConsumptionData = salesGasStrategy.hasGasConsumption
            ? (queries[VectorQueryIndex.GAS_CONSUMPTION].data ?? [])
            : [];
        const series = toRealizationCumulativeSeries(data, sourceKind);
        return {
            series,
            unit: data[0]?.unit ?? "",
            diagnostics: {
                hasSeries: series.length > 0,
                hasZeroGasConsumption:
                    salesGasStrategy.hasGasConsumption && isCumulativeVectorAllZero(gasConsumptionData),
                incompleteInjectionRealizations: [],
                incompleteConsumptionRealizations: [],
            },
        };
    }

    if (salesGasStrategy.kind === "DERIVED") {
        const gasProductionData = queries[VectorQueryIndex.GAS_PRODUCTION].data ?? [];
        const gasInjectionData = salesGasStrategy.hasGasInjection
            ? (queries[VectorQueryIndex.GAS_INJECTION].data ?? [])
            : null;
        const gasConsumptionData = salesGasStrategy.hasGasConsumption
            ? (queries[VectorQueryIndex.GAS_CONSUMPTION].data ?? [])
            : null;

        const derivedSalesGas = deriveSalesGasCumulative(
            gasProductionData,
            gasInjectionData,
            gasConsumptionData,
            sourceKind,
        );
        return {
            series: derivedSalesGas.series,
            unit: gasProductionData[0]?.unit ?? "",
            diagnostics: {
                hasSeries: derivedSalesGas.series.length > 0,
                hasZeroGasConsumption: gasConsumptionData !== null && isCumulativeVectorAllZero(gasConsumptionData),
                incompleteInjectionRealizations: derivedSalesGas.incompleteInjectionRealizations,
                incompleteConsumptionRealizations: derivedSalesGas.incompleteConsumptionRealizations,
            },
        };
    }

    // Zero sales gas follows the oil sampling and coverage, so it is confirmed zero wherever oil is covered.
    return {
        series: makeZeroCumulativeSeries(get(oilProductionSeriesAtom)),
        unit: ZERO_SALES_GAS_UNIT,
        diagnostics: NO_SALES_GAS_DIAGNOSTICS,
    };
});

/** A regular realization is extended with zero production after its source end; a delta one is not. */
function toProfile(
    series: RealizationCumulativeSeries | undefined,
    sourceKind: SourceKind,
): MonthlyProductionProfile | null {
    return series
        ? computeMonthlyVolumesFromCumulative(
              series.timestampsUtcMs,
              series.values,
              series.intervalCoverage,
              sourceKind === SourceKind.REGULAR ? series.supportEndUtcMs : null,
          )
        : null;
}

const realizationProfilesAtom = atom<RealizationProfiles[]>((get) => {
    const sourceKind = get(sourceKindAtom);
    const oilSeriesByRealization = new Map(get(oilProductionSeriesAtom).map((series) => [series.realization, series]));
    const gasSeriesByRealization = new Map(get(salesGasDataAtom).series.map((series) => [series.realization, series]));
    const realizations = [...new Set([...oilSeriesByRealization.keys(), ...gasSeriesByRealization.keys()])].sort(
        (first, second) => first - second,
    );
    return realizations.map((realization) => ({
        realization,
        oilProfile: toProfile(oilSeriesByRealization.get(realization), sourceKind),
        salesGasProfile: toProfile(gasSeriesByRealization.get(realization), sourceKind),
    }));
});

/**
 * Last supported month over the full fetched ensemble and every required product. Individual
 * realizations and products are validated against this common horizon; it is not proof of their support.
 */
const sourceEnvelopeEndMonthIndexAtom = atom<number | null>((get) => {
    if (get(sourceStatusAtom) !== SourceStatus.READY) {
        return null;
    }
    const supportEnds = [...get(oilProductionSeriesAtom), ...get(salesGasDataAtom).series]
        .map((series) => series.supportEndUtcMs)
        .filter((supportEnd): supportEnd is number => supportEnd !== null);
    return supportEnds.length > 0 ? lastSupportedMonthIndex(Math.max(...supportEnds)) : null;
});

/** The single acquisition result forwarded to the view; independent of prices, costs and display choices. */
export const sourceSnapshotAtom = atom<EconomicSourceSnapshot>((get) => {
    const status = get(sourceStatusAtom);
    const salesGasData = get(salesGasDataAtom);
    const isReady = status === SourceStatus.READY;
    return {
        ensembleIdent: get(validSelectedEnsembleIdentAtom),
        status,
        isFetching: get(isFetchingAtom),
        queryError: get(queryErrorAtom),
        salesGasStrategy: get(salesGasStrategyAtom),
        oilUnit: get(vectorDataQueriesAtom)[VectorQueryIndex.OIL_PRODUCTION].data?.[0]?.unit ?? "",
        gasUnit: salesGasData.unit,
        hasOilSeries: get(oilProductionSeriesAtom).length > 0,
        salesGas: salesGasData.diagnostics,
        realizationProfiles: isReady ? get(realizationProfilesAtom) : [],
        envelopeEndMonthIndex: isReady ? get(sourceEnvelopeEndMonthIndexAtom) : null,
    };
});

/** True while the source loads or refetches, including refetches that retain the previous envelope. */
export const isSourceLoadingAtom = atom<boolean>((get) => {
    return get(isFetchingAtom) || get(sourceStatusAtom) === SourceStatus.LOADING;
});

/** Reads the snapshot's inputs directly, so it keeps its identity while only the snapshot's fetching state changes. */
export const evaluationHorizonStateAtom = atom<EvaluationHorizonState>((get) => {
    return resolveEvaluationHorizon(get(predictionStartYearAtom), {
        status: get(sourceStatusAtom),
        envelopeEndMonthIndex: get(sourceEnvelopeEndMonthIndexAtom),
    });
});

/** From the full-ensemble snapshot, so realization filtering does not change the suggestions. */
export const predictionStartYearSuggestionsAtom = atom<number[]>((get) => {
    const snapshot = get(sourceSnapshotAtom);
    if (snapshot.envelopeEndMonthIndex === null) {
        return [];
    }
    return suggestPredictionStartYears(snapshot.realizationProfiles, snapshot.envelopeEndMonthIndex);
});

/** Coverage and confirmed absence of each product over the evaluation for the filtered realizations; null until known. */
export const selectedProductSupportAtom = atom<SelectedProductSupport | null>((get) => {
    const snapshot = get(sourceSnapshotAtom);
    const evaluationHorizon = get(evaluationHorizonStateAtom);
    if (evaluationHorizon.status !== "READY") {
        return null;
    }
    const realizations = new Set(get(validRealizationNumbersAtom) ?? []);
    const profiles = snapshot.realizationProfiles.filter((profile) => realizations.has(profile.realization));
    if (profiles.length === 0) {
        return null;
    }
    const { startYear, endMonthIndex } = evaluationHorizon.horizon;
    return summarizeSelectedProductSupport(profiles, monthIndexOf(startYear, 1), endMonthIndex);
});

/** Delta constituents' FGCT is reported for context only; it never gates results. */
export const constituentGasConsumptionWarningAtom = atom<string | null>((get) => {
    if (!get(isSelectedEnsembleDeltaAtom)) {
        return null;
    }
    const queries = get(deltaConstituentGasConsumptionQueriesAtom);
    if (queries.length !== 2) {
        return null;
    }
    const [comparisonQuery, referenceQuery] = queries;
    if (comparisonQuery.isError || referenceQuery.isError) {
        return "Constituent gas-consumption diagnostics are unavailable.";
    }
    if (!comparisonQuery.data || !referenceQuery.data) {
        return null;
    }
    if (comparisonQuery.data.length === 0 || referenceQuery.data.length === 0) {
        return "Constituent gas-consumption diagnostics are unavailable.";
    }
    const validRealizationNumbers = get(validRealizationNumbersAtom) ?? [];
    const comparisonSummary = summarizeCumulativeVectorTerminals(comparisonQuery.data, validRealizationNumbers);
    const referenceSummary = summarizeCumulativeVectorTerminals(referenceQuery.data, validRealizationNumbers);
    if (
        comparisonSummary.missingOrInvalidRealizations.length > 0 ||
        referenceSummary.missingOrInvalidRealizations.length > 0
    ) {
        return "Constituent gas-consumption diagnostics are incomplete.";
    }
    if (comparisonSummary.nonZeroCount === 0 && referenceSummary.nonZeroCount === 0) {
        return "No gas consumption is modelled in either delta constituent.";
    }
    return `Gas consumption is modelled in ${comparisonSummary.nonZeroCount} comparison and ${referenceSummary.nonZeroCount} reference realizations.`;
});

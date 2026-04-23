import type { EChartsOption } from "echarts";

import type {
    SummaryVectorObservations_api,
    VectorHistoricalData_api,
    VectorRealizationData_api,
    VectorStatisticData_api,
    StatisticValueObject_api,
    DerivedVectorInfo_api,
    Frequency_api,
} from "@api";
import { DerivedVectorType_api, StatisticFunction_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import type {
    BaseChartOptions,
    PointAnnotationTrace,
    ReferenceLineTrace,
    StatisticKey,
    SubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesStatistics,
    TimeseriesSubplotOverlays,
    TimeseriesTrace,
} from "@modules/_shared/eCharts";
import { buildTimeseriesChart } from "@modules/_shared/eCharts";
import { simulationUnitReformat, simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import type {
    StatisticsSelection,
    VectorHexColorMap,
    VectorSpec,
    VectorSpecWithData,
} from "../../typesAndEnums";
import { FanchartStatisticOption, FrequencyEnumToStringMapping, SubplotOwner, VisualizationMode } from "../../typesAndEnums";
import { createDerivedVectorDescription } from "../../utils/vectorDescriptionUtils";

import { scaleHexColorLightness } from "./colorUtils";
import type { EnsemblesContinuousParameterColoring } from "./ensemblesContinuousParameterColoring";
import { getHexColorFromOwner } from "./plotColoring";

const HISTORY_COLOR = "black";
const OBSERVATION_COLOR = "black";
const PARAMETER_FALLBACK_COLOR = "#808080";
const TRACE_FALLBACK_COLOR = "#000000";
const REALIZATION_BRIGHTNESS_SCALE = 1.3;

/** Zero-filled placeholder used for statistic keys that were not returned by the API. */
const EMPTY_STATISTICS: TimeseriesStatistics = {
    mean: [],
    p10: [],
    p50: [],
    p90: [],
    min: [],
    max: [],
};

export interface BuildEChartOptionArgs {
    subplotOwner: SubplotOwner;
    selectedVectorSpecifications: VectorSpec[];
    visualizationMode: VisualizationMode;
    statisticsSelection: StatisticsSelection;
    realizationData: VectorSpecWithData<VectorRealizationData_api[]>[];
    statisticsData: VectorSpecWithData<VectorStatisticData_api>[];
    historicalData: VectorSpecWithData<VectorHistoricalData_api>[];
    observationData: VectorSpecWithData<SummaryVectorObservations_api>[];
    vectorHexColorMap: VectorHexColorMap;
    ensemblesParameterColoring: EnsemblesContinuousParameterColoring | null;
    showHistorical: boolean;
    showObservations: boolean;
    colorByParameter: boolean;
    resampleFrequency: Frequency_api | null;
    makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string;
    baseOptions: BaseChartOptions;
}

export interface BuildEChartOptionResult {
    option: EChartsOption;
    timestamps: number[];
}

export function buildEChartOption(args: BuildEChartOptionArgs): BuildEChartOptionResult {
    const { subplotOwner, selectedVectorSpecifications } = args;

    const uniqueVectorNames = Array.from(new Set(selectedVectorSpecifications.map((spec) => spec.vectorName)));
    const uniqueEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] = [];
    for (const spec of selectedVectorSpecifications) {
        if (!uniqueEnsembleIdents.some((existing) => existing.equals(spec.ensembleIdent))) {
            uniqueEnsembleIdents.push(spec.ensembleIdent);
        }
    }

    const numSubplots = subplotOwner === SubplotOwner.VECTOR ? uniqueVectorNames.length : uniqueEnsembleIdents.length;
    if (numSubplots === 0) {
        return { option: {}, timestamps: [] };
    }

    const vectorUnitMap = new Map<string, { unit: string; derivedVectorInfo?: DerivedVectorInfo_api | null }>();
    const subplotTraceMap: Map<number, TimeseriesTrace[]> = new Map();
    const subplotOverlays: TimeseriesSubplotOverlays[] = Array.from({ length: numSubplots }, () => ({
        referenceLineTraces: [],
        pointAnnotationTraces: [],
    }));
    for (let index = 0; index < numSubplots; index++) subplotTraceMap.set(index, []);

    const getSubplotIndex = (spec: VectorSpec): number => {
        if (subplotOwner === SubplotOwner.VECTOR) return uniqueVectorNames.indexOf(spec.vectorName);
        return uniqueEnsembleIdents.findIndex((ident) => ident.equals(spec.ensembleIdent));
    };

    const makeTraceName = (spec: VectorSpec): string =>
        subplotOwner === SubplotOwner.ENSEMBLE ? spec.vectorName : args.makeEnsembleDisplayName(spec.ensembleIdent);

    const registerUnit = (
        vectorName: string,
        unit: string | undefined,
        derivedVectorInfo?: DerivedVectorInfo_api | null,
    ): void => {
        if (vectorUnitMap.has(vectorName)) return;
        vectorUnitMap.set(vectorName, { unit: unit ?? "", derivedVectorInfo });
    };

    // ── Build member/statistics traces based on visualization mode ──────────
    const displayConfig = makeDisplayConfig(args.visualizationMode, args.statisticsSelection);
    const useBrightenedRealizations =
        args.visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS && !args.colorByParameter;

    const showRealizationMembers =
        args.visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        args.visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    const showStatisticTraces =
        args.visualizationMode === VisualizationMode.STATISTICAL_LINES ||
        args.visualizationMode === VisualizationMode.STATISTICAL_FANCHART ||
        args.visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS;

    if (showRealizationMembers) {
        const memberTraces = buildMemberTraces({
            subplotOwner,
            selectedVectorSpecifications,
            realizationData: args.realizationData,
            vectorHexColorMap: args.vectorHexColorMap,
            ensemblesParameterColoring: args.colorByParameter ? args.ensemblesParameterColoring : null,
            useBrightenedColor: useBrightenedRealizations,
            makeTraceName,
        });
        for (const entry of memberTraces) {
            const subplotIndex = getSubplotIndex(entry.spec);
            if (subplotIndex === -1) continue;
            subplotTraceMap.get(subplotIndex)?.push(entry.trace);
            registerUnit(entry.spec.vectorName, entry.unit, entry.derivedVectorInfo);
        }
    }

    if (showStatisticTraces) {
        const statisticTraces = buildStatisticsTraces({
            subplotOwner,
            selectedVectorSpecifications,
            statisticsData: args.statisticsData,
            vectorHexColorMap: args.vectorHexColorMap,
            makeTraceName,
        });
        for (const entry of statisticTraces) {
            const subplotIndex = getSubplotIndex(entry.spec);
            if (subplotIndex === -1) continue;
            subplotTraceMap.get(subplotIndex)?.push(entry.trace);
            registerUnit(entry.spec.vectorName, entry.unit, entry.derivedVectorInfo);
        }
    }

    // ── Build overlay traces ─────────────────────────────────────────────────
    if (args.showHistorical) {
        for (const entry of args.historicalData) {
            if (!isSelected(entry.vectorSpecification, selectedVectorSpecifications)) continue;
            const subplotIndex = getSubplotIndex(entry.vectorSpecification);
            if (subplotIndex === -1) continue;
            subplotOverlays[subplotIndex].referenceLineTraces.push({
                name: `History: ${makeTraceName(entry.vectorSpecification)}`,
                color: HISTORY_COLOR,
                timestamps: entry.data.timestampsUtcMs,
                values: entry.data.values,
                lineShape: getTraceLineShape(entry.data),
            } satisfies ReferenceLineTrace);
            registerUnit(entry.vectorSpecification.vectorName, entry.data.unit);
        }
    }

    if (args.showObservations) {
        for (const entry of args.observationData) {
            if (!isSelected(entry.vectorSpecification, selectedVectorSpecifications)) continue;
            const subplotIndex = getSubplotIndex(entry.vectorSpecification);
            if (subplotIndex === -1) continue;
            subplotOverlays[subplotIndex].pointAnnotationTraces.push({
                name: `Observation: ${makeTraceName(entry.vectorSpecification)}`,
                color: OBSERVATION_COLOR,
                annotations: entry.data.observations.map((obs) => ({
                    date: Date.parse(obs.date),
                    value: obs.value,
                    error: obs.error,
                    label: obs.label,
                    comment: obs.comment ?? undefined,
                })),
            } satisfies PointAnnotationTrace);
        }
    }

    // ── Assemble subplot groups in deterministic order ──────────────────────
    const subplotGroups: SubplotGroup<TimeseriesTrace>[] = [];
    for (let index = 0; index < numSubplots; index++) {
        const title = buildSubplotTitle({
            subplotOwner,
            index,
            uniqueVectorNames,
            uniqueEnsembleIdents,
            vectorUnitMap,
            resampleFrequency: args.resampleFrequency,
            makeEnsembleDisplayName: args.makeEnsembleDisplayName,
        });
        subplotGroups.push({
            title,
            traces: subplotTraceMap.get(index) ?? [],
        });
    }

    const timestamps = selectFirstTimestamps(args);
    const yAxisLabel = uniqueVectorNames.length === 1 ? vectorUnitMap.get(uniqueVectorNames[0])?.unit || "Value" : "Value";

    const option = buildTimeseriesChart(subplotGroups, {
        ...args.baseOptions,
        subplotOverlays,
        displayConfig,
        yAxisLabel,
        memberLabel: "Realization",
        zoomable: true,
    });

    return { option, timestamps };
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function isSelected(spec: VectorSpec, selected: VectorSpec[]): boolean {
    return selected.some((sel) => sel.vectorName === spec.vectorName);
}

function makeDisplayConfig(
    visualizationMode: VisualizationMode,
    statisticsSelection: StatisticsSelection,
): TimeseriesDisplayConfig {
    switch (visualizationMode) {
        case VisualizationMode.INDIVIDUAL_REALIZATIONS:
            return {
                showMembers: true,
                showStatistics: false,
                showFanchart: false,
                showReferenceLines: true,
                showPointAnnotations: true,
                selectedStatistics: [],
            };
        case VisualizationMode.STATISTICAL_LINES:
            return {
                showMembers: false,
                showStatistics: true,
                showFanchart: false,
                showReferenceLines: true,
                showPointAnnotations: true,
                selectedStatistics: mapIndividualStatistics(statisticsSelection.IndividualStatisticsSelection),
            };
        case VisualizationMode.STATISTICAL_FANCHART:
            return {
                showMembers: false,
                showStatistics: true,
                showFanchart: true,
                showReferenceLines: true,
                showPointAnnotations: true,
                selectedStatistics: mapFanchartStatistics(statisticsSelection.FanchartStatisticsSelection),
            };
        case VisualizationMode.STATISTICS_AND_REALIZATIONS:
            return {
                showMembers: true,
                showStatistics: true,
                showFanchart: false,
                showReferenceLines: true,
                showPointAnnotations: true,
                selectedStatistics: mapIndividualStatistics(statisticsSelection.IndividualStatisticsSelection),
            };
    }
}

function mapIndividualStatistics(selection: StatisticFunction_api[]): StatisticKey[] {
    const keys: StatisticKey[] = [];
    for (const fn of selection) {
        switch (fn) {
            case StatisticFunction_api.MEAN: keys.push("mean"); break;
            case StatisticFunction_api.MIN: keys.push("min"); break;
            case StatisticFunction_api.MAX: keys.push("max"); break;
            case StatisticFunction_api.P10: keys.push("p10"); break;
            case StatisticFunction_api.P50: keys.push("p50"); break;
            case StatisticFunction_api.P90: keys.push("p90"); break;
        }
    }
    return keys;
}

function mapFanchartStatistics(selection: FanchartStatisticOption[]): StatisticKey[] {
    const keys: StatisticKey[] = [];
    if (selection.includes(FanchartStatisticOption.MEAN)) keys.push("mean");
    if (selection.includes(FanchartStatisticOption.P10_P90)) keys.push("p10", "p90");
    if (selection.includes(FanchartStatisticOption.MIN_MAX)) keys.push("min", "max");
    return keys;
}

function isDerivedVectorOfType(
    vectorData: VectorRealizationData_api | VectorStatisticData_api | VectorHistoricalData_api,
    type: DerivedVectorType_api,
): boolean {
    return "derivedVectorInfo" in vectorData && vectorData.derivedVectorInfo?.type === type;
}

function getTraceLineShape(
    vectorData: VectorRealizationData_api | VectorStatisticData_api | VectorHistoricalData_api,
): "linear" | "hv" | "vh" {
    if (
        isDerivedVectorOfType(vectorData, DerivedVectorType_api.PER_DAY) ||
        isDerivedVectorOfType(vectorData, DerivedVectorType_api.PER_INTVL)
    ) {
        return "hv";
    }
    if (vectorData.isRate) return "vh";
    return "linear";
}

type MemberTraceEntry = {
    spec: VectorSpec;
    trace: TimeseriesTrace;
    unit: string;
    derivedVectorInfo?: DerivedVectorInfo_api | null;
};

function buildMemberTraces(input: {
    subplotOwner: SubplotOwner;
    selectedVectorSpecifications: VectorSpec[];
    realizationData: VectorSpecWithData<VectorRealizationData_api[]>[];
    vectorHexColorMap: VectorHexColorMap;
    ensemblesParameterColoring: EnsemblesContinuousParameterColoring | null;
    useBrightenedColor: boolean;
    makeTraceName: (spec: VectorSpec) => string;
}): MemberTraceEntry[] {
    const result: MemberTraceEntry[] = [];
    for (const entry of input.realizationData) {
        if (!isSelected(entry.vectorSpecification, input.selectedVectorSpecifications)) continue;
        if (entry.data.length === 0) continue;

        const baseColor = getHexColorFromOwner(
            input.subplotOwner,
            entry.vectorSpecification,
            input.vectorHexColorMap,
            TRACE_FALLBACK_COLOR,
        );
        const traceColor = input.useBrightenedColor
            ? scaleHexColorLightness(baseColor, REALIZATION_BRIGHTNESS_SCALE) ?? baseColor
            : baseColor;

        const timestamps = entry.data[0].timestampsUtcMs;
        const memberValues: number[][] = [];
        const memberIds: number[] = [];
        const memberColors: string[] = [];
        let useParameterColors = false;

        for (const realizationData of entry.data) {
            memberValues.push(realizationData.values);
            memberIds.push(realizationData.realization);

            const parameterColor = resolveParameterColor(
                entry.vectorSpecification,
                realizationData.realization,
                input.ensemblesParameterColoring,
            );
            if (parameterColor !== null) {
                memberColors.push(parameterColor);
                useParameterColors = true;
            } else {
                memberColors.push(traceColor);
            }
        }

        result.push({
            spec: entry.vectorSpecification,
            unit: entry.data[0].unit,
            derivedVectorInfo: entry.data[0].derivedVectorInfo,
            trace: {
                name: input.makeTraceName(entry.vectorSpecification),
                color: traceColor,
                timestamps,
                memberValues,
                memberIds,
                memberColors: useParameterColors ? memberColors : undefined,
                lineShape: getTraceLineShape(entry.data[0]),
            },
        });
    }
    return result;
}

function resolveParameterColor(
    spec: VectorSpec,
    realization: number,
    coloring: EnsemblesContinuousParameterColoring | null,
): string | null {
    if (!coloring) return null;
    const ensembleIdent = spec.ensembleIdent;
    if (!isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) return null;
    if (!coloring.hasParameterForEnsemble(ensembleIdent)) return PARAMETER_FALLBACK_COLOR;
    if (!coloring.hasParameterRealizationValue(ensembleIdent, realization)) return PARAMETER_FALLBACK_COLOR;
    const value = coloring.getParameterRealizationValue(ensembleIdent, realization);
    return coloring.getColorScale().getColorForValue(value);
}

function buildStatisticsTraces(input: {
    subplotOwner: SubplotOwner;
    selectedVectorSpecifications: VectorSpec[];
    statisticsData: VectorSpecWithData<VectorStatisticData_api>[];
    vectorHexColorMap: VectorHexColorMap;
    makeTraceName: (spec: VectorSpec) => string;
}): MemberTraceEntry[] {
    const result: MemberTraceEntry[] = [];
    for (const entry of input.statisticsData) {
        if (!isSelected(entry.vectorSpecification, input.selectedVectorSpecifications)) continue;

        const color = getHexColorFromOwner(
            input.subplotOwner,
            entry.vectorSpecification,
            input.vectorHexColorMap,
            TRACE_FALLBACK_COLOR,
        );

        result.push({
            spec: entry.vectorSpecification,
            unit: entry.data.unit,
            derivedVectorInfo: entry.data.derivedVectorInfo,
            trace: {
                name: input.makeTraceName(entry.vectorSpecification),
                color,
                timestamps: entry.data.timestampsUtcMs,
                statistics: extractStatistics(entry.data.valueObjects),
                lineShape: getTraceLineShape(entry.data),
            },
        });
    }
    return result;
}

function extractStatistics(valueObjects: StatisticValueObject_api[]): TimeseriesStatistics {
    const stats: TimeseriesStatistics = { ...EMPTY_STATISTICS, mean: [], p10: [], p50: [], p90: [], min: [], max: [] };
    for (const valueObject of valueObjects) {
        switch (valueObject.statisticFunction) {
            case StatisticFunction_api.MEAN: stats.mean = valueObject.values; break;
            case StatisticFunction_api.MIN: stats.min = valueObject.values; break;
            case StatisticFunction_api.MAX: stats.max = valueObject.values; break;
            case StatisticFunction_api.P10: stats.p10 = valueObject.values; break;
            case StatisticFunction_api.P50: stats.p50 = valueObject.values; break;
            case StatisticFunction_api.P90: stats.p90 = valueObject.values; break;
        }
    }
    return stats;
}

function buildSubplotTitle(input: {
    subplotOwner: SubplotOwner;
    index: number;
    uniqueVectorNames: string[];
    uniqueEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
    vectorUnitMap: Map<string, { unit: string; derivedVectorInfo?: DerivedVectorInfo_api | null }>;
    resampleFrequency: Frequency_api | null;
    makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent) => string;
}): string {
    if (input.subplotOwner === SubplotOwner.VECTOR) {
        const vectorName = input.uniqueVectorNames[input.index];
        const unitEntry = input.vectorUnitMap.get(vectorName);
        const description = buildVectorDescription(vectorName, unitEntry?.derivedVectorInfo, input.resampleFrequency);
        const unitText = unitEntry?.unit ? ` [${simulationUnitReformat(unitEntry.unit)}]` : "";
        return `${description}${unitText}`;
    }
    return `Ensemble: ${input.makeEnsembleDisplayName(input.uniqueEnsembleIdents[input.index])}`;
}

function buildVectorDescription(
    vectorName: string,
    derivedVectorInfo: DerivedVectorInfo_api | null | undefined,
    resampleFrequency: Frequency_api | null,
): string {
    if (derivedVectorInfo) {
        const derivedDescription = createDerivedVectorDescription(derivedVectorInfo.sourceVector, derivedVectorInfo.type);
        if (resampleFrequency) {
            const frequencyString = FrequencyEnumToStringMapping[resampleFrequency];
            return `${frequencyString} ${derivedDescription}`;
        }
        return derivedDescription;
    }
    return simulationVectorDescription(vectorName);
}

function selectFirstTimestamps(args: BuildEChartOptionArgs): number[] {
    for (const entry of args.realizationData) {
        if (entry.data.length > 0) return entry.data[0].timestampsUtcMs;
    }
    for (const entry of args.statisticsData) {
        if (entry.data.timestampsUtcMs.length > 0) return entry.data.timestampsUtcMs;
    }
    return [];
}

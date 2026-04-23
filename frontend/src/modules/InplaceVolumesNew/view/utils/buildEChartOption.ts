import type { EChartsOption } from "echarts";

import { BarSortBy as InplaceVolumesBarSortBy, type InplaceVolumesPlotOptions } from "@modules/_shared/InplaceVolumes/plotOptions";
import {
    buildBarChart,
    buildConvergenceChart,
    buildDensityChart,
    buildHistogramChart,
    buildPercentileRangeChart,
    HistogramType as EChartsHistogramType,
    type BarTrace,
    type ChartZoomState,
    type DistributionTrace,
    type SubplotGroup,
} from "@modules/_shared/eCharts";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";

import type { ColorEntry, GroupedTableData } from "./GroupedTableData";

type BuildInplaceVolumesChartOptionArgs = {
    groupedData: GroupedTableData;
    plotType: PlotType;
    resultName: string;
    selectorColumn: string | null;
    colorBy: string;
    plotOptions: InplaceVolumesPlotOptions;
    highlightedSubplotKeys: string[];
    zoomState?: ChartZoomState;
};

export function buildInplaceVolumesChartOption({
    groupedData,
    plotType,
    resultName,
    selectorColumn,
    colorBy,
    plotOptions,
    highlightedSubplotKeys,
    zoomState,
}: BuildInplaceVolumesChartOptionArgs): EChartsOption {
    const highlightedSubplotIndices = groupedData
        .getSubplotGroups()
        .flatMap(function findHighlightedSubplotIndex(group, index) {
            return highlightedSubplotKeys.includes(group.subplotKey) ? [index] : [];
        });

    const baseOptions = {
        sharedXAxis: plotOptions.sharedXAxis,
        sharedYAxis: plotOptions.sharedYAxis,
        zoomable: true,
        zoomState,
        highlightedSubplotIndices,
    };

    if (plotType === PlotType.HISTOGRAM) {
        return buildHistogramChart(buildDistributionGroups(groupedData, resultName), {
            ...baseOptions,
            xAxisLabel: resultName,
            yAxisLabel: "Percentage (%)",
            numBins: plotOptions.histogramBins,
            histogramType: toEChartsHistogramType(plotOptions.histogramType),
            showMemberPoints: plotOptions.showRealizationPoints,
            showPercentageInBar: plotOptions.showPercentageInHistogram,
            showStatisticalMarkers: plotOptions.showStatisticalMarkers,
            showStatisticalLabels: plotOptions.showStatisticalLabels,
        });
    }

    if (plotType === PlotType.DISTRIBUTION) {
        return buildDensityChart(buildDistributionGroups(groupedData, resultName), {
            ...baseOptions,
            xAxisLabel: resultName,
            showMemberPoints: plotOptions.showRealizationPoints,
        });
    }

    if (plotType === PlotType.BOX) {
        return buildPercentileRangeChart(buildDistributionGroups(groupedData, resultName), {
            ...baseOptions,
            xAxisLabel: resultName,
            showMemberPoints: plotOptions.showRealizationPoints,
        });
    }

    if (plotType === PlotType.CONVERGENCE) {
        return buildConvergenceChart(buildDistributionGroups(groupedData, resultName, { requireMemberIds: true }), {
            ...baseOptions,
            xAxisLabel: "Realizations",
            yAxisLabel: resultName,
        });
    }

    if (plotType === PlotType.BAR && selectorColumn) {
        return buildBarChart(buildBarGroups(groupedData, resultName, selectorColumn), {
            ...baseOptions,
            xAxisLabel: selectorColumn,
            yAxisLabel: resultName,
            sortBy: selectorColumn === colorBy ? "values" : toEChartsBarSortBy(plotOptions.barSortBy),
            showStatisticalMarkers: plotOptions.showStatisticalMarkers,
            showLabels: true,
        });
    }

    return {};
}

function buildDistributionGroups(
    groupedData: GroupedTableData,
    resultName: string,
    options: { requireMemberIds?: boolean } = {},
): SubplotGroup<DistributionTrace>[] {
    return groupedData.getSubplotGroups().flatMap(function buildSubplotGroup(group) {
        const traces = group.colorEntries
            .map(function buildTrace(entry) {
                return makeDistributionTrace(entry, resultName, options.requireMemberIds ?? false);
            })
            .filter(isDefined);

        return traces.length > 0
            ? [{ title: group.subplotLabel, traces }]
            : [];
    });
}

function buildBarGroups(groupedData: GroupedTableData, resultName: string, selectorColumn: string): SubplotGroup<BarTrace>[] {
    return groupedData.getSubplotGroups().flatMap(function buildSubplotGroup(group) {
        const traces = group.colorEntries
            .map(function buildTrace(entry) {
                return makeBarTrace(entry, resultName, selectorColumn);
            })
            .filter(isDefined);

        return traces.length > 0
            ? [{ title: group.subplotLabel, traces }]
            : [];
    });
}

function makeDistributionTrace(
    entry: ColorEntry,
    resultName: string,
    requireMemberIds: boolean,
): DistributionTrace | null {
    const resultColumn = entry.table.getColumn(resultName);
    const realColumn = entry.table.getColumn("REAL");

    if (!resultColumn || (requireMemberIds && !realColumn)) {
        return null;
    }

    const rawValues = resultColumn.getAllRowValues();
    const rawMemberIds = realColumn?.getAllRowValues();
    const values: number[] = [];
    const memberIds: number[] = [];

    for (let index = 0; index < rawValues.length; index++) {
        const value = Number(rawValues[index]);
        if (!Number.isFinite(value)) {
            continue;
        }

        values.push(value);

        if (rawMemberIds) {
            const memberId = Number(rawMemberIds[index]);
            memberIds.push(Number.isFinite(memberId) ? memberId : index);
        }
    }

    if (values.length === 0) {
        return null;
    }

    return {
        name: entry.colorLabel,
        color: entry.color,
        values,
        memberIds: rawMemberIds ? memberIds : undefined,
    };
}

function makeBarTrace(entry: ColorEntry, resultName: string, selectorColumn: string): BarTrace | null {
    const resultColumn = entry.table.getColumn(resultName);
    const selectorValueColumn = entry.table.getColumn(selectorColumn);

    if (!resultColumn || !selectorValueColumn) {
        return null;
    }

    const sums = new Map<string | number, number>();
    const counts = new Map<string | number, number>();
    const selectorValues = selectorValueColumn.getAllRowValues();
    const resultValues = resultColumn.getAllRowValues();

    for (let index = 0; index < selectorValues.length; index++) {
        const category = selectorValues[index] as string | number;
        const value = Number(resultValues[index]);
        if (!Number.isFinite(value)) {
            continue;
        }

        sums.set(category, (sums.get(category) ?? 0) + value);
        counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    const categories = Array.from(sums.keys());
    if (categories.length === 0) {
        return null;
    }

    return {
        name: entry.colorLabel,
        color: entry.color,
        categories,
        values: categories.map(function computeMeanForCategory(category) {
            return (sums.get(category) ?? 0) / (counts.get(category) ?? 1);
        }),
    };
}

function toEChartsHistogramType(histogramType: InplaceVolumesPlotOptions["histogramType"]): EChartsHistogramType {
    switch (histogramType) {
        case EChartsHistogramType.Stack:
            return EChartsHistogramType.Stack;
        case EChartsHistogramType.Group:
            return EChartsHistogramType.Group;
        case EChartsHistogramType.Relative:
            return EChartsHistogramType.Relative;
        case EChartsHistogramType.Overlay:
        default:
            return EChartsHistogramType.Overlay;
    }
}

function toEChartsBarSortBy(barSortBy: InplaceVolumesBarSortBy): "categories" | "values" {
    return barSortBy === InplaceVolumesBarSortBy.Yvalues ? "values" : "categories";
}

function isDefined<T>(value: T | null): value is T {
    return value !== null;
}
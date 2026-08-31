import { computeGroupedStatistics, type GroupedStatistics } from "@framework/domain/groupedStatistics";
import type { RealizationTable } from "@framework/domain/RealizationTable";

import type { VisualizationKind } from "../dataProviders/visualizationKinds";

import { PlotDimension, type SeriesVisualization } from "./plotTypes";

export type PlotAccumulatedData = {
    series: readonly SeriesVisualization[];
    realizationTables: readonly RealizationTable[];
};

export type PlotColor = {
    key: string;
    color: string;
};

export type PlotFacet = {
    key: string;
    row: number;
    column: number;
    series: readonly SeriesVisualization[];
};

export type PlotStatisticsTable = {
    table: RealizationTable;
    groups: readonly GroupedStatistics[];
};

export type PlotGroupProduct = {
    visualizationKind: VisualizationKind;
    colorBy: PlotDimension;
    subplotBy: PlotDimension;
    colors: readonly PlotColor[];
    facets: readonly PlotFacet[];
    legendKeys: readonly string[];
    statisticsTables: readonly PlotStatisticsTable[];
};

export type CollectPlotGroupOptions = {
    visualizationKind: VisualizationKind;
    colorBy: PlotDimension;
    subplotBy: PlotDimension;
    categoricalPalette: readonly string[];
    ensembleColors?: Readonly<Record<string, string>>;
};

export function makeEmptyPlotAccumulatedData(): PlotAccumulatedData {
    return { series: [], realizationTables: [] };
}

export function accumulatePlotData(
    accumulatedData: PlotAccumulatedData,
    series: readonly SeriesVisualization[],
    realizationTable?: RealizationTable,
): PlotAccumulatedData {
    return {
        series: [...(accumulatedData.series ?? []), ...series],
        realizationTables: [
            ...(accumulatedData.realizationTables ?? []),
            ...(realizationTable ? [realizationTable] : []),
        ],
    };
}

export function collectPlotGroup(
    accumulatedData: PlotAccumulatedData,
    options: CollectPlotGroupOptions,
): PlotGroupProduct {
    const normalizedAccumulatedData = {
        series: accumulatedData.series ?? [],
        realizationTables: accumulatedData.realizationTables ?? [],
    };
    const colors = allocatePlotColors(
        normalizedAccumulatedData.series,
        options.colorBy,
        options.categoricalPalette,
        options.ensembleColors,
    );
    const facets = makePlotFacets(normalizedAccumulatedData.series, options.subplotBy);
    const statisticsGroupColumns = [options.subplotBy, options.colorBy].filter(
        (dimension, index, dimensions) =>
            dimension !== PlotDimension.NONE && dimensions.indexOf(dimension) === index,
    );

    return {
        visualizationKind: options.visualizationKind,
        colorBy: options.colorBy,
        subplotBy: options.subplotBy,
        colors,
        facets,
        legendKeys: colors.map((item) => item.key),
        statisticsTables: normalizedAccumulatedData.realizationTables.map((table) => ({
            table,
            groups: computeGroupedStatistics(
                table,
                statisticsGroupColumns.filter((columnName) => columnName in table.indexColumns),
            ),
        })),
    };
}

export function allocatePlotColors(
    series: readonly SeriesVisualization[],
    colorBy: PlotDimension,
    categoricalPalette: readonly string[],
    ensembleColors: Readonly<Record<string, string>> = {},
): PlotColor[] {
    if (categoricalPalette.length === 0) throw new Error("A categorical palette must contain at least one color");

    const keys = getSortedDimensionDomain(series, colorBy);
    return keys.map((key, index) => ({
        key,
        color:
            (colorBy === PlotDimension.ENSEMBLE ? ensembleColors[key] : undefined) ??
            getPreferredProviderColor(series, colorBy, key) ??
            categoricalPalette[index % categoricalPalette.length],
    }));
}

export function makePlotFacets(
    series: readonly SeriesVisualization[],
    subplotBy: PlotDimension,
): PlotFacet[] {
    if (subplotBy === PlotDimension.NONE) return [{ key: PlotDimension.NONE, row: 0, column: 0, series }];

    const keys = getSortedDimensionDomain(series, subplotBy);
    const columnCount = Math.max(1, Math.ceil(Math.sqrt(keys.length)));
    return keys.map((key, index) => ({
        key,
        row: Math.floor(index / columnCount),
        column: index % columnCount,
        series: series.filter((item) => makeDimensionKey(item.groupKeys[subplotBy]) === key),
    }));
}

function getSortedDimensionDomain(series: readonly SeriesVisualization[], dimension: PlotDimension): string[] {
    return [...new Set(series.map((item) => makeDimensionKey(item.groupKeys[dimension])))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
    );
}

function makeDimensionKey(value: string | number | undefined): string {
    return value === undefined ? "(none)" : String(value);
}

function getPreferredProviderColor(
    series: readonly SeriesVisualization[],
    colorBy: PlotDimension,
    key: string,
): string | undefined {
    if (colorBy !== PlotDimension.PROVIDER) return undefined;
    return series.find((item) => makeDimensionKey(item.groupKeys[colorBy]) === key)?.styleHints?.preferredColor;
}
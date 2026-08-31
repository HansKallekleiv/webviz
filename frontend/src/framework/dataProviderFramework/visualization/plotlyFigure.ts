import type { Data, Layout, PlotData } from "plotly.js";

import { VisualizationKind } from "../dataProviders/visualizationKinds";

import type { PlotGroupProduct } from "./plotCollector";
import type { SeriesIdentityMap, SeriesPointIdentity, SeriesVisualization } from "./plotTypes";

export type PlotHoverIdentity = {
    realization: number | null;
    timestampUtcMs: number | null;
};

export type PlotlyFigureProduct = {
    data: Partial<Data>[];
    layout: Partial<Layout>;
    identityMaps: readonly (SeriesIdentityMap | undefined)[];
};

export function makePlotlyFigure(
    product: PlotGroupProduct,
    hoveredIdentity: PlotHoverIdentity = { realization: null, timestampUtcMs: null },
): PlotlyFigureProduct {
    if (product.visualizationKind === VisualizationKind.TABLE) return makeStatisticsTableFigure(product);

    const colors = new Map(product.colors.map((item) => [item.key, item.color]));
    const data: Partial<PlotData>[] = [];
    const identityMaps: (SeriesIdentityMap | undefined)[] = [];
    const legendKeys = new Set<string>();

    for (const facet of product.facets) {
        const orderedSeries = orderStatisticsBands(facet.series);
        for (const series of orderedSeries) {
            const colorKey = makeDimensionKey(series.groupKeys[product.colorBy]);
            const showlegend = !legendKeys.has(colorKey);
            legendKeys.add(colorKey);
            data.push(
                makeTrace(
                    series,
                    product.visualizationKind,
                    facet.row,
                    facet.column,
                    getColumnCount(product),
                    colorKey,
                    colors.get(colorKey),
                    showlegend,
                    hoveredIdentity,
                ),
            );
            identityMaps.push(series.identity);
        }
    }

    const rowCount = Math.max(1, ...product.facets.map((facet) => facet.row + 1));
    const columnCount = getColumnCount(product);
    return {
        data,
        identityMaps,
        layout: {
            autosize: true,
            hovermode: "closest",
            grid: { rows: rowCount, columns: columnCount, pattern: "independent" },
            legend: { orientation: "h" },
            margin: { l: 56, r: 24, t: product.facets.length > 1 ? 48 : 24, b: 48 },
            annotations: product.facets.length > 1 ? makeFacetAnnotations(product, rowCount, columnCount) : [],
        },
    };
}

export function getSeriesPointIdentity(
    identityMaps: readonly (SeriesIdentityMap | undefined)[],
    curveNumber: number,
    pointIndex: number,
): SeriesPointIdentity | null {
    return identityMaps[curveNumber]?.[pointIndex] ?? null;
}

function makeTrace(
    series: SeriesVisualization,
    visualizationKind: VisualizationKind,
    row: number,
    column: number,
    columnCount: number,
    colorKey: string,
    color: string | undefined,
    showlegend: boolean,
    hoveredIdentity: PlotHoverIdentity,
): Partial<PlotData> {
    const axisIndex = row * columnCount + column + 1;
    const common = {
        name: colorKey,
        legendgroup: colorKey,
        showlegend,
        xaxis: axisIndex === 1 ? "x" : `x${axisIndex}`,
        yaxis: axisIndex === 1 ? "y" : `y${axisIndex}`,
        selectedpoints: makeSelectedPoints(series.identity, hoveredIdentity),
        selected: { marker: { opacity: 1 } },
        unselected: { marker: { opacity: 0.2 } },
    } as Partial<PlotData>;

    if (visualizationKind === VisualizationKind.HISTOGRAM) {
        return { ...common, type: "histogram", x: Array.from(series.points.y), marker: { color } };
    }
    if (visualizationKind === VisualizationKind.BOX) {
        return { ...common, type: "box", y: Array.from(series.points.y), marker: { color } };
    }
    if (visualizationKind === VisualizationKind.BAR) {
        return {
            ...common,
            type: "bar",
            x: Array.from(series.points.x),
            y: Array.from(series.points.y),
            marker: { color },
        };
    }

    const statistic = series.groupKeys.statistic;
    const fillsBand = statistic === "P10" || statistic === "MAX";
    const yValues = Array.from(series.points.y);
    return {
        ...common,
        type: "scatter",
        mode: series.role === "observation" ? "markers" : "lines+markers",
        x:
            visualizationKind === VisualizationKind.CONVERGENCE
                ? yValues.map((_, index) => index + 1)
                : Array.from(series.points.x),
        y: visualizationKind === VisualizationKind.CONVERGENCE ? makeCumulativeMean(yValues) : yValues,
        marker: { color, size: series.role === "observation" ? 8 : 5 },
        line: {
            color,
            dash: (series.styleHints?.dash ?? (series.role === "history" ? "dash" : "solid")) as Plotly.Dash,
        },
        fill: series.role === "statistics-band" && fillsBand ? "tonexty" : "none",
    };
}

function makeSelectedPoints(
    identityMap: SeriesIdentityMap | undefined,
    hoveredIdentity: PlotHoverIdentity,
): number[] | undefined {
    if (!identityMap || (hoveredIdentity.realization === null && hoveredIdentity.timestampUtcMs === null)) {
        return undefined;
    }
    return identityMap.flatMap((identity, pointIndex) => {
        if (!identity) return [];
        const realizationMatches =
            hoveredIdentity.realization === null || identity.realization === hoveredIdentity.realization;
        const timestampMatches =
            hoveredIdentity.timestampUtcMs === null || identity.timestampUtcMs === hoveredIdentity.timestampUtcMs;
        return realizationMatches && timestampMatches ? [pointIndex] : [];
    });
}

function orderStatisticsBands(series: readonly SeriesVisualization[]): readonly SeriesVisualization[] {
    const order = new Map([
        ["MIN", 0],
        ["MAX", 1],
        ["P90", 2],
        ["P10", 3],
        ["P50", 4],
        ["MEAN", 5],
    ]);
    return [...series].sort(
        (first, second) =>
            (order.get(String(first.groupKeys.statistic)) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(String(second.groupKeys.statistic)) ?? Number.MAX_SAFE_INTEGER),
    );
}

function makeStatisticsTableFigure(product: PlotGroupProduct): PlotlyFigureProduct {
    const rows = product.statisticsTables.flatMap(({ groups }) => groups);
    const groupNames = [...new Set(rows.flatMap((row) => Object.keys(row.group)))];
    const valueNames = [...new Set(rows.flatMap((row) => Object.keys(row.valueStatistics)))];
    const headers = [
        ...groupNames,
        ...valueNames.flatMap((valueName) =>
            ["mean", "p10", "p90", "min", "max", "stdDev"].map((statistic) => `${valueName} ${statistic}`),
        ),
    ];
    const cells = [
        ...groupNames.map((groupName) => rows.map((row) => String(row.group[groupName] ?? ""))),
        ...valueNames.flatMap((valueName) =>
            ["mean", "p10", "p90", "min", "max", "stdDev"].map((statistic) =>
                rows.map((row) => row.valueStatistics[valueName]?.[statistic as keyof typeof row.valueStatistics[string]] ?? ""),
            ),
        ),
    ];
    const tableTrace = { type: "table", header: { values: headers }, cells: { values: cells } } as Partial<Data>;
    return {
        data: [tableTrace],
        layout: { autosize: true, margin: { l: 8, r: 8, t: 8, b: 8 } },
        identityMaps: [undefined],
    };
}

function getColumnCount(product: PlotGroupProduct): number {
    return Math.max(1, ...product.facets.map((facet) => facet.column + 1));
}

function makeFacetAnnotations(product: PlotGroupProduct, rowCount: number, columnCount: number) {
    return product.facets.map((facet) => ({
        text: facet.key,
        showarrow: false,
        xref: "paper" as const,
        yref: "paper" as const,
        x: (facet.column + 0.5) / columnCount,
        y: 1 - facet.row / rowCount,
        yanchor: "bottom" as const,
    }));
}

function makeDimensionKey(value: string | number | undefined): string {
    return value === undefined ? "(none)" : String(value);
}

function makeCumulativeMean(values: readonly number[]): number[] {
    let sum = 0;
    return values.map((value, index) => {
        sum += value;
        return sum / (index + 1);
    });
}
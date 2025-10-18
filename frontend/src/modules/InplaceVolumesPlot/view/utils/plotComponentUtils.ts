import { formatRgb, parse } from "culori";
import type { Axis, Config, Layout, PlotData } from "plotly.js";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import { makeHistogramTrace } from "@modules/_shared/histogram";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { computeQuantile } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import type {
    BarSortBy,
    InplaceVolumesPlotOptions,
} from "@modules/InplaceVolumesPlot/settings/components/inplaceVolumesPlotOptionsDialog";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

import type { RealizationAndResult } from "./convergenceCalculation";
import { calcConvergenceArray } from "./convergenceCalculation";
import { sortBarPlotData } from "./plotDataCalculations";

export function makeFormatLabelFunction(
    ensembleSet: EnsembleSet,
): (columnName: string, value: string | number) => string {
    return function formatLabel(columnName: string, value: string | number): string {
        if (columnName === TableOriginKey.ENSEMBLE) {
            const ensembleIdent = RegularEnsembleIdent.fromString(value.toString());
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                return makeDistinguishableEnsembleDisplayName(ensembleIdent, ensembleSet.getRegularEnsembleArray());
            }
        }
        return value.toString();
    };
}

export function makePlotData(
    plotType: PlotType,
    firstResultName: string,
    secondResultNameOrSelectorName: string,
    colorBy: string,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    plotOptions: InplaceVolumesPlotOptions,
): (table: Table) => Partial<PlotData>[] {
    // Maps to store already used colors and position for each key for consistency across subplots
    const keyToColor: Map<string, string> = new Map();
    const boxPlotKeyToPositionMap: Map<string, number> = new Map();
    const NUM_HISTOGRAM_BINS = 10;

    return (table: Table): Partial<PlotData>[] => {
        if (table.getColumn(colorBy) === undefined) {
            throw new Error(`Column to color by "${colorBy}" not found in the table.`);
        }

        const collection = table.splitByColumn(colorBy);

        const data: Partial<PlotData>[] = [];
        let color = colorSet.getFirstColor();
        for (const [key, table] of collection.getCollectionMap()) {
            let title = key.toString();
            if (colorBy === TableOriginKey.ENSEMBLE) {
                const ensembleIdent = RegularEnsembleIdent.fromString(key.toString());
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                if (ensemble) {
                    color = ensemble.getColor();
                    title = makeDistinguishableEnsembleDisplayName(
                        ensembleIdent,
                        ensembleSet.getRegularEnsembleArray(),
                    );
                }
            }

            // Extract color or current collection key
            let keyColor = keyToColor.get(key.toString());
            if (keyColor === undefined) {
                keyColor = color;
                keyToColor.set(key.toString(), keyColor);
                color = colorSet.getNextColor();
            }

            if (plotType === PlotType.HISTOGRAM) {
                data.push(
                    ...makeHistogram(
                        title,
                        table,
                        firstResultName,
                        keyColor,
                        NUM_HISTOGRAM_BINS,
                        plotOptions.showStatisticalMarkers,
                        plotOptions.showRealizationPoints,
                    ),
                );
            } else if (plotType === PlotType.CONVERGENCE) {
                data.push(...makeConvergencePlot(title, table, firstResultName, keyColor));
            } else if (plotType === PlotType.DISTRIBUTION) {
                data.push(...makeDistributionPlot(title, table, firstResultName, keyColor));
            } else if (plotType === PlotType.BOX) {
                let yAxisPosition = boxPlotKeyToPositionMap.get(key.toString());
                if (yAxisPosition === undefined) {
                    yAxisPosition = -boxPlotKeyToPositionMap.size; // Negative value for placing top down
                    boxPlotKeyToPositionMap.set(key.toString(), yAxisPosition);
                }
                data.push(
                    ...makeBoxPlot(
                        title,
                        table,
                        firstResultName,
                        keyColor,
                        plotOptions.showStatisticalMarkers,
                        plotOptions.showRealizationPoints,
                        yAxisPosition,
                    ),
                );
            } else if (plotType === PlotType.SCATTER) {
                data.push(...makeScatterPlot(title, table, firstResultName, secondResultNameOrSelectorName, keyColor));
            } else if (plotType === PlotType.BAR) {
                data.push(
                    ...makeBarPlot(
                        title,
                        table,
                        firstResultName,
                        secondResultNameOrSelectorName,
                        keyColor,
                        plotOptions.barSortBy,
                        plotOptions.showStatisticalMarkers,
                    ),
                );
            }
        }

        return data;
    };
}

function makeBarPlot(
    title: string,
    table: Table,
    resultName: string,
    selectorName: string,
    color: string,
    barSortBy: BarSortBy,
    showStatisticalMarkers: boolean,
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }
    const selectorColumn = table.getColumn(selectorName);
    if (!selectorColumn) {
        return [];
    }

    const xValues = selectorColumn.getAllRowValues();
    const yValues = resultColumn.getAllRowValues();

    const dataPoints = xValues.map((x, i) => ({ x, y: yValues[i] }));

    // Sort using the utility function
    const sortedPoints = sortBarPlotData(dataPoints, barSortBy);

    // Extract sorted x and y values
    const sortedXValues = sortedPoints.map((p) => p.x);
    const sortedYValues = sortedPoints.map((p) => p.y);

    // Create custom hover text
    const hoverText = sortedPoints.map(
        (p) => `<b>${selectorName}:</b> ${p.x}<br><b>${resultName}:</b> ${formatNumber(Number(p.y))}<extra></extra>`,
    );

    data.push({
        x: sortedXValues,
        y: sortedYValues,
        name: title,
        type: "bar",
        marker: {
            color,
            opacity: 0.8,
        },
        hovertemplate: hoverText,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    });

    if (showStatisticalMarkers) {
        // Add quantile and mean horizontal lines
        const numericYValues = sortedYValues.map((v) => Number(v));
        const statisticLines = createStatisticLinesForBarPlot(numericYValues, sortedXValues, title, color, resultName);
        data.push(...statisticLines);
    }

    return data;
}

/**
 * Creates horizontal lines for P10, Mean, and P90 on bar plots
 */
function createStatisticLinesForBarPlot(
    yValues: number[],
    xValues: (string | number)[],
    title: string,
    color: string,
    resultName: string,
): Partial<PlotData>[] {
    // Calculate quantiles and mean
    const p90 = computeQuantile(yValues, 0.9);
    const p10 = computeQuantile(yValues, 0.1);
    const mean = yValues.reduce((a, b) => a + b, 0) / yValues.length;

    // For categorical x-axis, we need to span from the first to the last category
    const xStart = xValues[0];
    const xEnd = xValues[xValues.length - 1];

    // Create horizontal lines for P10, Mean, and P90
    const p10Trace: Partial<PlotData> = {
        x: [xStart, xEnd],
        y: [p10, p10],
        type: "scatter",
        mode: "lines",
        line: {
            color: color,
            width: 3,
            dash: "dash",
        },
        showlegend: false,
        name: "P10",
        legendgroup: title,
        hovertemplate: `<b>${title}</b><br><b>P10</b><br>${resultName}: ${formatNumber(p10)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    const meanTrace: Partial<PlotData> = {
        x: [xStart, xEnd],
        y: [mean, mean],
        type: "scatter",
        mode: "lines",
        line: {
            color: color,
            width: 3,
            dash: "solid",
        },
        showlegend: false,
        name: "Mean",
        legendgroup: title,
        hovertemplate: `<b>${title}</b><br><b>Mean</b><br>${resultName}: ${formatNumber(mean)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    const p90Trace: Partial<PlotData> = {
        x: [xStart, xEnd],
        y: [p90, p90],
        type: "scatter",
        mode: "lines",
        line: {
            color: color,
            width: 3,
            dash: "dash",
        },
        showlegend: false,
        name: "P90",
        legendgroup: title,
        hovertemplate: `<b>${title}</b><br><b>P90</b><br>${resultName}: ${formatNumber(p90)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    return [p10Trace, meanTrace, p90Trace];
}

function makeConvergencePlot(title: string, table: Table, resultName: string, color: string): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const realizationAndResultArray: RealizationAndResult[] = [];
    const reals = table.getColumn("REAL");
    const results = table.getColumn(resultName);
    if (!reals) {
        throw new Error("REAL column not found");
    }
    if (!results) {
        return [];
    }
    for (let i = 0; i < reals.getNumRows(); i++) {
        realizationAndResultArray.push({
            realization: reals.getRowValue(i) as number,
            resultValue: results.getRowValue(i) as number,
        });
    }

    const convergenceArr = calcConvergenceArray(realizationAndResultArray);

    let lightColor = color;
    const rgbColor = parse(color);
    if (rgbColor) {
        rgbColor.alpha = 0.3;
        lightColor = formatRgb(rgbColor);
    }

    data.push(
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p90),
            name: "P90",
            type: "scatter",
            showlegend: false,
            line: {
                color,
                width: 1,
                dash: "dashdot",
            },
            mode: "lines",
            hoverlabel: {
                bgcolor: "white",
                font: { size: 12, color: "black" },
            },
            hovertemplate: convergenceArr.map(
                (p) =>
                    `${title}</br>Realization: ${p.realization}<br>P90: ${formatNumber(Number(p.p90))}<extra></extra>`,
            ),
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.mean),
            name: title,
            type: "scatter",
            showlegend: true,
            line: {
                color,
                width: 1,
            },
            mode: "lines",
            fill: "tonexty",
            fillcolor: lightColor,
            hoverlabel: {
                bgcolor: "white",
                font: { size: 12, color: "black" },
            },
            hovertemplate: convergenceArr.map(
                (p) =>
                    `${title}</br>Realization: ${p.realization}<br>Mean: ${formatNumber(Number(p.mean))}<extra></extra>`,
            ),
        },
        {
            x: convergenceArr.map((el) => el.realization),
            y: convergenceArr.map((el) => el.p10),
            name: "P10",
            type: "scatter",
            showlegend: false,
            line: {
                color,
                width: 1,
                dash: "dash",
            },
            mode: "lines",
            fill: "tonexty",
            fillcolor: lightColor,
            hoverlabel: {
                bgcolor: "white",
                font: { size: 12, color: "black" },
            },
            hovertemplate: convergenceArr.map(
                (p) =>
                    `${title}</br>Realization: ${p.realization}<br>P10: ${formatNumber(Number(p.p10))}<extra></extra>`,
            ),
        },
    );

    return data;
}

function makeHistogram(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    numBins: number,
    showStatisticalMarkers: boolean,
    showRealizationPoints: boolean,
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const xValues = resultColumn.getAllRowValues() as number[];

    const histogram = makeHistogramTrace({
        xValues,
        numBins: numBins,
        color,
    });

    histogram.name = title;
    histogram.legendgroup = title;
    histogram.showlegend = true;

    data.push(histogram);

    if (showStatisticalMarkers) {
        // Add quantile and mean vertical lines
        const statisticLines = createStatisticLinesForHistogram(xValues, title, color, numBins, resultName);
        data.push(...statisticLines);
    }

    if (showRealizationPoints) {
        // Add rug trace to show individual realization points
        const rugTrace = createRugTraceForHistogram(xValues, title, color);
        data.push(rugTrace);
    }

    return data;
}

/**
 * Creates vertical lines for P10, Mean, and P90 on histogram plots
 */
function createStatisticLinesForHistogram(
    xValues: number[],
    title: string,
    color: string,
    numBins: number,
    resultName: string,
): Partial<PlotData>[] {
    // Calculate quantiles and mean
    const p90 = computeQuantile(xValues, 0.9);
    const p10 = computeQuantile(xValues, 0.1);
    const mean = xValues.reduce((a, b) => a + b, 0) / xValues.length;

    // Calculate the histogram bins to find the maximum percentage
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const range = xMax - xMin;
    const binSize = range / numBins;

    // Count values in each bin
    const binCounts = new Array(numBins).fill(0);
    xValues.forEach((value) => {
        const binIndex = Math.min(Math.floor((value - xMin) / binSize), numBins - 1);
        binCounts[binIndex]++;
    });

    // Convert to percentages
    const totalCount = xValues.length;
    const binPercentages = binCounts.map((count) => (count / totalCount) * 100);
    const maxPercentage = Math.max(...binPercentages);
    const lineHeight = maxPercentage * 1.15; // Extend 15% above the highest bar

    // Create vertical lines for P10, Mean, and P90
    const p10Trace: Partial<PlotData> = {
        x: [p10, p10],
        y: [0, lineHeight],
        type: "scatter",
        mode: "lines",
        line: {
            color: color,
            width: 4,
            dash: "dash",
        },
        showlegend: false,
        name: "P10",
        legendgroup: title,
        hovertemplate: `<b>${title}</b><br><b>P10</b><br>${resultName}: ${formatNumber(p10)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    const meanTrace: Partial<PlotData> = {
        x: [mean, mean],
        y: [0, lineHeight],
        type: "scatter",
        mode: "lines",
        line: {
            color: color,
            width: 4,
            dash: "solid",
        },
        showlegend: false,
        name: "Mean",
        legendgroup: title,
        hovertemplate: `<b>${title}</b><br><b>Mean</b><br>${resultName}: ${formatNumber(mean)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    const p90Trace: Partial<PlotData> = {
        x: [p90, p90],
        y: [0, lineHeight],
        type: "scatter",
        mode: "lines",
        line: {
            color: color,
            width: 4,
            dash: "dash",
        },
        showlegend: false,
        name: "P90",
        legendgroup: title,
        hovertemplate: `<b>${title}</b><br><b>P90</b><br>${resultName}: ${formatNumber(p90)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    return [p10Trace, meanTrace, p90Trace];
}

/**
 * Creates a rug trace showing individual realization points at the bottom of histogram plots
 */
function createRugTraceForHistogram(xValues: number[], title: string, color: string): Partial<PlotData> {
    // Create a rug plot below the x-axis to avoid overlapping with histogram bars
    const rugTrace: Partial<PlotData> = {
        x: xValues,
        y: new Array(xValues.length).fill(-2), // Position below x-axis
        type: "scatter",
        mode: "markers",
        marker: {
            color: color,
            symbol: "line-ns-open",
            line: {
                width: 1,
                color: color,
            },
            size: 10,
            opacity: 0.6,
        },
        showlegend: false,
        name: "Realizations",
        legendgroup: title,
        hovertemplate: `<b>${title}</b><br>Value: %{x}<br>Realization: %{pointNumber}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    return rugTrace;
}

function makeDistributionPlot(title: string, table: Table, resultName: string, color: string): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }

    const xValues = resultColumn.getAllRowValues().map((el) => parseFloat(el.toString()));

    data.push({
        x: xValues,
        name: title,
        legendgroup: title,
        type: "violin",
        marker: {
            color,
        },
        // @ts-expect-error - arguments in the plotly types
        side: "positive",
        y0: 0,
        orientation: "h",
        spanmode: "hard",
        meanline: { visible: true },
        points: false,
        hoverinfo: "none",
    });

    return data;
}

function makeBoxPlot(
    title: string,
    table: Table,
    resultName: string,
    color: string,
    showStatisticalMarkers: boolean,
    showRealizationPoints: boolean,
    yAxisPosition?: number,
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const resultColumn = table.getColumn(resultName);
    if (!resultColumn) {
        return [];
    }
    const values = resultColumn.getAllRowValues();

    // Check if all values are numbers
    if (!Array.isArray(values) || values.length === 0 || !values.every((val) => typeof val === "number")) {
        return [];
    }

    data.push({
        x: values,
        name: title,
        legendgroup: title,
        type: "box",
        marker: {
            color,
        },
        // @ts-expect-error - missing arguments in the plotly types
        y0: yAxisPosition ?? 0,
        hoverinfo: "skip",
        boxpoints: showRealizationPoints ? "all" : "outliers",
        hovertemplate: `${title}<br>${resultName}: <b>%{x}</b> <br>Realization: <b>%{pointNumber}</b> <extra></extra>`,

        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    });
    if (showStatisticalMarkers) {
        data.push(...createQuantileAndMeanMarkerTracesForBoxPlot(title, resultName, values, yAxisPosition ?? 0, color));
    }
    return data;
}

export function createQuantileAndMeanMarkerTracesForBoxPlot(
    title: string,
    resultName: string,
    values: number[],
    yPosition: number,
    ensembleColor: string | undefined,
): Partial<PlotData>[] {
    const p90 = computeQuantile(values, 0.9);
    const p10 = computeQuantile(values, 0.1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const p10Trace: Partial<PlotData> = {
        x: [p10],
        y: [yPosition],
        type: "scatter",
        hoverinfo: "x+text",
        hovertext: "P10",
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
        hovertemplate: `<b>${title}</b><br><b>P10</b><br>${resultName}: ${formatNumber(p10)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    const meanTrace: Partial<PlotData> = {
        x: [mean],
        y: [yPosition],
        type: "scatter",
        hoverinfo: "x+text",
        hovertext: "Mean",
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
        hovertemplate: `<b>${title}</b><br><b>Mean</b><br>${resultName}: ${formatNumber(mean)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    const p90Trace: Partial<PlotData> = {
        x: [p90],
        y: [yPosition],
        type: "scatter",
        hoverinfo: "x+text",
        hovertext: "P90",
        showlegend: false,
        marker: { color: ensembleColor, symbol: "x", size: 10 },
        hovertemplate: `<b>${title}</b><br><b>P90</b><br>${resultName}: ${formatNumber(p90)}<extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    };

    return [p10Trace, meanTrace, p90Trace];
}
function makeScatterPlot(
    title: string,
    table: Table,
    firstResultName: string,
    secondResultName: string,
    color: string,
): Partial<PlotData>[] {
    const data: Partial<PlotData>[] = [];

    const firstResultColumn = table.getColumn(firstResultName);
    if (!firstResultColumn) {
        return [];
    }

    const secondResultColumn = table.getColumn(secondResultName);
    if (!secondResultColumn) {
        return [];
    }
    const realColumn = table.getColumn("REAL");
    if (!realColumn) {
        return [];
    }

    data.push({
        x: firstResultColumn.getAllRowValues(),
        y: secondResultColumn.getAllRowValues(),
        name: title,
        text: realColumn.getAllRowValues().map((realization) => realization.toString()),
        legendgroup: title,
        mode: "markers",
        marker: {
            color,
            size: 5,
        },
        type: "scatter",
        hovertemplate: `${firstResultName} = <b>%{x}</b> <br>${secondResultName} = <b>%{y}</b> <br>Realization = <b>%{text}</b> <extra></extra>`,
        hoverlabel: {
            bgcolor: "white",
            font: { size: 12, color: "black" },
        },
    });

    return data;
}

export function makeAxisOptions(
    plotType: PlotType,
    firstResultName: string | null,
    secondResultName: string | null,
): { xAxisOptions: Partial<Axis>; yAxisOptions: Partial<Axis> } {
    let xAxisOptions: Partial<Axis> = {};
    let yAxisOptions: Partial<Axis> = {};

    if (plotType === PlotType.SCATTER) {
        xAxisOptions = { title: { text: firstResultName ?? "", standoff: 20 } };
        yAxisOptions = { title: { text: secondResultName ?? "", standoff: 20 } };
    } else if (plotType === PlotType.CONVERGENCE) {
        xAxisOptions = { title: { text: "Realizations", standoff: 5 } };
        yAxisOptions = { title: { text: firstResultName ?? "", standoff: 5 } };
    } else if (plotType === PlotType.BOX) {
        yAxisOptions = { showticklabels: false };
    } else if (plotType === PlotType.HISTOGRAM) {
        yAxisOptions = { title: { text: "Percentage (%)" } };
    } else if (plotType === PlotType.BAR) {
        // For bar plots, use 'trace' order to preserve the order from the data
        // rather than Plotly's default alphabetical sorting
        // Hide tick labels as they can be messy - values are shown on hover
        xAxisOptions = {
            type: "category",
            categoryorder: "trace",
            showticklabels: false,
            title: { text: `${secondResultName ?? ""} (hover to see values)`, standoff: 5 },
        };
        yAxisOptions = { title: { text: firstResultName ?? "", standoff: 5 } };
    }

    return { xAxisOptions, yAxisOptions };
}

export function createLegendPlot(traces: Partial<PlotData>[]): {
    id: string;
    data: Partial<PlotData>[];
    layout: Partial<Layout>;
    config: Partial<Config>;
} {
    const legendTraces = traces.map((trace) => ({
        ...trace,
        x: [null],
        y: [null],
        showlegend: trace.showlegend,
    }));

    return {
        id: "legend-plot",
        data: legendTraces,
        layout: {
            xaxis: {
                visible: false,
                showgrid: false,
                zeroline: false,
            },
            yaxis: {
                visible: false,
                showgrid: false,
                zeroline: false,
            },
            showlegend: true,
            legend: {
                orientation: "h",
                y: 0.5,
                x: 0.5,
                xanchor: "center",
                yanchor: "middle",
                tracegroupgap: 0,
                itemclick: false,
                itemdoubleclick: false,
            },
            margin: { t: 5, b: 5, l: 5, r: 5 },
        },
        config: { displayModeBar: false },
    };
}

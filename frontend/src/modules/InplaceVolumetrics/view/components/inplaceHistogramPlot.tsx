import Plot from "react-plotly.js";

import { InplaceVolGroupedResultValues } from "@modules/InplaceVolumetrics/utils/inplaceVolDataEnsembleSetAccessor";
import { computeQuantile } from "@modules/_shared/statistics";

import { Layout, PlotData, PlotType, Shape } from "plotly.js";
import { R } from "vitest/dist/reporters-qc5Smpt5";

const colorPalette = [
    "#1f77b4", // muted blue
    "#ff7f0e", // safety orange
    "#2ca02c", // cooked asparagus green
    "#d62728", // brick red
    "#9467bd", // muted purple
    "#8c564b", // chestnut brown
    "#e377c2", // raspberry yogurt pink
    "#7f7f7f", // middle gray
    "#bcbd22", // curry yellow-green
    "#17becf", // blue-teal
];

export type InplaceResultValues = {
    groupByName: string;
    colorByName: string;
    groupedValues: InplaceVolGroupedResultValues[];
};
export type InplaceHistogramPlotProps = {
    resultValues: InplaceResultValues;
    width: number;
    height: number;
};
export function InplaceHistogramPlot(props: InplaceHistogramPlotProps): React.ReactElement {
    const numSubplots = props.resultValues.groupedValues.length;
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);

    function generateTraces(): Partial<PlotData>[] {
        const addedLegendNames: Set<string> = new Set();
        const traces: Partial<PlotData>[] = [];
        let subplotIndex = 1;
        let colorIndex = 0;
        let globalMin = Number.POSITIVE_INFINITY;
        let globalMax = Number.NEGATIVE_INFINITY;

        props.resultValues.groupedValues.forEach((subPlot) => {
            subPlot.subgroups.forEach((subgroup) => {
                const min = Math.min(...subgroup.resultValues);
                const max = Math.max(...subgroup.resultValues);
                globalMin = Math.min(globalMin, min);
                globalMax = Math.max(globalMax, max);
            });
        });

        props.resultValues.groupedValues.forEach((subPlot) => {
            let subGroupValueMin = Number.POSITIVE_INFINITY;
            let subGroupValueMax = Number.NEGATIVE_INFINITY;
            if (subPlot) {
                subPlot.subgroups.forEach((subgroup) => {
                    const min = Math.min(...subgroup.resultValues);
                    const max = Math.max(...subgroup.resultValues);
                    subGroupValueMin = Math.min(subGroupValueMin, min);
                    subGroupValueMax = Math.max(subGroupValueMax, max);
                });
                const binSize = (subGroupValueMax - subGroupValueMin) / 20;
                subPlot.subgroups.forEach((subgroup) => {
                    const shouldShowLegend = !addedLegendNames.has(subgroup.subgroupName.toString());
                    if (shouldShowLegend) {
                        addedLegendNames.add(subgroup.subgroupName.toString());
                    }
                    const trace: Partial<PlotData> = {
                        x: subgroup.resultValues,
                        type: "histogram",
                        histnorm: "percent",
                        opacity: 0.7,
                        name: subgroup.subgroupName.toString(),
                        showlegend: shouldShowLegend,
                        marker: {
                            color: colorPalette[colorIndex % colorPalette.length],
                            line: { width: 1, color: "black" },
                        },
                        xaxis: `x${subplotIndex}`,
                        yaxis: `y${subplotIndex}`,
                        xbins: {
                            start: subGroupValueMin,
                            end: subGroupValueMax,
                            size: binSize,
                        },
                    };
                    traces.push(trace);

                    colorIndex++;
                });
            }
            subplotIndex++;
        });

        return traces;
    }

    function generateLayout(): Layout {
        const layout: any = {
            height: props.height,
            width: props.width,
            showlegend: true,
            margin: { l: 50, r: 0, b: 50, t: 50 },
            grid: { rows: numRows, columns: numColumns, pattern: "independent" },
            annotations: [],
            barmode: "overlay",
        };

        for (let i = 1; i <= props.resultValues.groupedValues.length; i++) {
            const resultGroup = props.resultValues.groupedValues[i - 1];
            layout[`xaxis${i}`] = {
                title: resultGroup.groupName,
                mirror: true,
                showline: true,
                linewidth: 1,
                linecolor: "black",
            };
            layout[`yaxis${i}`] = {
                showticklabels: false,
                showgrid: false,
                zeroline: false,
                mirror: true,
                showline: true,
                linewidth: 1,
                linecolor: "black",
            };
            layout.annotations.push({
                text: "",
                showarrow: false,
                x: 0,
                xref: `x${i} domain`,
                y: 1.1,
                yref: `y${i} domain`,
            });
        }

        return layout;
    }
    const data = generateTraces();
    const layout = generateLayout();
    return <Plot data={data} layout={layout} config={{ displayModeBar: false }} />;
}

export interface HistogramPlotData extends Partial<PlotData> {
    nbinsx: number;
}

export function addHistogramTrace(values: number[]): Partial<HistogramPlotData> {
    return {
        x: values,
        type: "histogram",
        histnorm: "percent",
        opacity: 0.7,
        nbinsx: 15,
        marker: {
            color: "green",
            line: { width: 1, color: "black" },
        },
    };
}
function addStatisticallines(values: number[]): Partial<Shape>[] {
    const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
    const p10Val = computeQuantile(values, 0.1);
    const p90Val = computeQuantile(values, 0.9);

    return [
        addVerticalLine(p10Val, "red", "P90"),
        addVerticalLine(meanVal, "red", "Mean"),
        addVerticalLine(p90Val, "red", "P10"),
    ];
}

function addVerticalLine(x: number, color: string, text: string): Partial<Shape> {
    return {
        label: {
            textposition: "end",
            textangle: 35,
            font: { size: 14, color: "red" },
            yanchor: "bottom",
            xanchor: "right",
            text: text,
        },
        type: "line",
        x0: x,
        x1: x,
        y0: 0,
        y1: 0.95,
        xref: "x",
        yref: "paper",
        line: {
            color: color,
            width: 3,
            dash: "dash",
        },
    };
}

import type { Shape } from "plotly.js";

import type { PlotItem } from "@modules/_shared/components/VirtualizedPlotlyFigure";
import type { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";

/**
 * Creates a highlight shape for a plot when an item is hovered
 */
export function createHighlightShape(): Partial<Shape> {
    return {
        type: "rect",
        line: {
            color: "blue",
            width: 2,
        },
        x0: 0,
        x1: 1,
        y0: 0,
        y1: 1,
        xref: "paper",
        yref: "paper",
    };
}

/**
 * Creates a plot item with common layout options
 */
export function createPlotItem(
    id: string,
    traces: Plotly.Data[],
    xAxisOptions: Partial<Plotly.LayoutAxis>,
    yAxisOptions: Partial<Plotly.LayoutAxis>,
    histogramType: "stack" | "group" | "overlay" | "relative",
    plotType: PlotType,
    options: {
        title?: string | { text: string; font?: { size: number } };
        showLegend: boolean;
        displayModeBar: boolean;
        shapes?: Partial<Shape>[];
        placeholderLabel?: string;
        xAxisOverrides?: Partial<Plotly.LayoutAxis>;
        yAxisOverrides?: Partial<Plotly.LayoutAxis>;
    },
): PlotItem {
    return {
        id,
        data: traces,
        layout: {
            title: options.title,
            barmode: histogramType,
            xaxis: {
                ...xAxisOptions,
                ...options.xAxisOverrides,
            },
            yaxis: {
                ...yAxisOptions,
                ...options.yAxisOverrides,
            },
            showlegend: options.showLegend,
            margin: { t: 40, b: 50, l: 50, r: 20 },
            shapes: options.shapes,
        },
        config: { displayModeBar: options.displayModeBar },
        placeholderLabel: options.placeholderLabel,
    };
}

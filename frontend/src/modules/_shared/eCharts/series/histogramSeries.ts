import type {
    CallbackDataParams,
    CustomSeriesRenderItem,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    CustomSeriesRenderItemReturn,
    LineSeriesOption,
} from "echarts/types/dist/shared";

import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import type { ChartSeriesOption } from "../builders/composeChartOption";
import { formatCompactTooltip } from "../interaction/tooltipFormatters";
import type { DistributionTrace, PointStatistics } from "../types";
import { HistogramType } from "../types";
import { computeHistogramLayout, computeHistogramTraceData } from "../utils/histogram";
import { computePointStatistics } from "../utils/statistics";

export interface HistogramDisplayOptions {
    numBins?: number;
    showStatisticalMarkers?: boolean;
    showStatisticalLabels?: boolean;
    showRealizationPoints?: boolean;
    showPercentageInBar?: boolean;
    color?: string;
    opacity?: number;
    borderColor?: string;
    borderWidth?: number;
}

export function buildHistogramSeries(
    trace: DistributionTrace,
    options: HistogramDisplayOptions = {},
    axisIndex = 0,
): ChartSeriesOption[] {
    const {
        numBins = 15,
        showStatisticalMarkers = false,
        showStatisticalLabels = false,
        showRealizationPoints = false,
        showPercentageInBar = false,
        color = trace.color,
        opacity = showStatisticalMarkers ? 0.6 : 1,
        borderColor = "black",
        borderWidth = 1,
    } = options;

    if (trace.values.length === 0) return [];

    const stats = computePointStatistics(trace.values);
    const traceData = computeHistogramTraceData([trace], numBins);
    const histogramLayout = computeHistogramLayout(traceData, HistogramType.Overlay);
    const bars = histogramLayout.barsByTrace[0] ?? [];
    const maxPercentage = histogramLayout.yMax;

    const series: ChartSeriesOption[] = [];

    series.push({
        type: "custom",
        name: trace.name,
        data: bars.map((bar, index) => ({
            value: [bar.xStart, bar.xEnd, bar.yStart, bar.yEnd],
            binIndex: index,
            count: bar.count,
            percentage: bar.percentage,
        })),
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        renderItem: ((
            _params: CustomSeriesRenderItemParams,
            api: CustomSeriesRenderItemAPI,
        ): CustomSeriesRenderItemReturn => {
            const startValue = Number(api.value(0));
            const endValue = Number(api.value(1));
            const yStart = Number(api.value(2));
            const yEnd = Number(api.value(3));
            const percentage = yEnd - yStart;

            const bottomLeft = api.coord([startValue, yStart]);
            const topRight = api.coord([endValue, yEnd]);
            const rect = {
                x: bottomLeft[0],
                y: topRight[1],
                width: Math.max(topRight[0] - bottomLeft[0], 1),
                height: Math.max(bottomLeft[1] - topRight[1], 0),
            };

            const children: CustomSeriesRenderItemReturn[] = [
                {
                    type: "rect" as const,
                    shape: rect,
                    style: {
                        fill: color,
                        opacity,
                        stroke: borderColor,
                        lineWidth: borderWidth,
                    },
                },
            ];

            if (showPercentageInBar && percentage > 0) {
                children.push({
                    type: "text" as const,
                    style: {
                        text: `${percentage.toFixed(1)}%`,
                        x: rect.x + rect.width / 2,
                        y: rect.y - 4,
                        fontSize: 10,
                        fill: "#333",
                    },
                } as CustomSeriesRenderItemReturn);
            }

            return {
                type: "group" as const,
                children: children as NonNullable<CustomSeriesRenderItemReturn>[],
            };
        }) as CustomSeriesRenderItem,
        tooltip: {
            formatter: (params: CallbackDataParams) => {
                const [startValue, endValue, yStart, yEnd] = params.value as [number, number, number, number];
                const percentage = yEnd - yStart;
                return formatCompactTooltip(trace.name, [
                    { label: "Range", value: `${formatNumber(startValue)} - ${formatNumber(endValue)}` },
                    { label: "Percentage", value: `${percentage.toFixed(2)}%` },
                ]);
            },
        },
        z: 2,
    });

    if (showStatisticalMarkers) {
        series.push(
            ...createHistogramStatLines(
                stats,
                maxPercentage * 1.05,
                trace.name,
                color,
                axisIndex,
                showStatisticalLabels,
            ),
        );
    }

    if (showRealizationPoints) {
        series.push({
            type: "scatter",
            name: trace.name,
            data: trace.values.map((value, index) => ({
                value: [value, -2],
                realizationId: trace.realizationIds?.[index] ?? index,
            })),
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            symbol: "rect",
            symbolSize: [1.5, 10],
            itemStyle: { color, opacity: 0.6 },
            tooltip: {
                formatter: (params: CallbackDataParams) => {
                    const value = Array.isArray(params.value) ? Number(params.value[0]) : Number(params.value);
                    const realizationId =
                        params.data && typeof params.data === "object" && "realizationId" in params.data
                            ? (params.data as { realizationId: number }).realizationId
                            : params.dataIndex;
                    return formatCompactTooltip(trace.name, [
                        { label: "Value", value: formatNumber(value) },
                        { label: "Realization", value: String(realizationId) },
                    ]);
                },
            },
            z: 3,
        });
    }

    return series;
}

function createHistogramStatLines(
    stats: PointStatistics,
    maxPct: number,
    traceName: string,
    color: string,
    axisIndex: number,
    showLabels = false,
): LineSeriesOption[] {
    function makeLine(value: number, label: string, dash: "solid" | "dashed" | "dotted"): LineSeriesOption {
        return {
            type: "line",
            name: traceName,
            xAxisIndex: axisIndex,
            yAxisIndex: axisIndex,
            data: [
                [value, 0],
                [value, maxPct],
            ],
            lineStyle: { color, width: 4, type: dash },
            symbol: "none",
            silent: true,
            tooltip: {
                formatter: formatCompactTooltip(traceName, [{ label, value: formatNumber(value), color }]),
            },
            endLabel: showLabels
                ? {
                      show: true,
                      formatter: `${label}: ${formatNumber(value)}`,
                      fontSize: 11,
                  }
                : undefined,
        };
    }

    return [
        makeLine(stats.p10, "P10", "dashed"),
        makeLine(stats.mean, "Mean", "solid"),
        makeLine(stats.p90, "P90", "dashed"),
    ];
}

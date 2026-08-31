import type React from "react";

import type { PlotDatum, PlotMouseEvent } from "plotly.js";
import BasePlot from "react-plotly.js";

import { HoverTopic, useHoverValue, usePublishHoverValues, type HoverService } from "@framework/HoverService";

import { VisualizationKind } from "../dataProviders/visualizationKinds";

import type { PlotGroupProduct } from "./plotCollector";
import { getSeriesPointIdentity, makePlotlyFigure } from "./plotlyFigure";
import { PlotStatisticsTable } from "./PlotStatisticsTable";

export type PlotViewWrapperProps = {
    product: PlotGroupProduct;
    hoverService: HoverService;
    moduleInstanceId: string;
};

export function PlotViewWrapper(props: PlotViewWrapperProps): React.ReactNode {
    const hoveredRealization = useHoverValue(HoverTopic.REALIZATION, props.hoverService, props.moduleInstanceId);
    const hoveredTimestamp = useHoverValue(HoverTopic.TIMESTAMP, props.hoverService, props.moduleInstanceId);
    const publishHoverValues = usePublishHoverValues(props.hoverService, props.moduleInstanceId);
    if (props.product.visualizationKind === VisualizationKind.TABLE) {
        return <PlotStatisticsTable product={props.product} />;
    }
    const figure = makePlotlyFigure(props.product, {
        realization: hoveredRealization,
        timestampUtcMs: hoveredTimestamp,
    });

    function handleHover(event: PlotMouseEvent): void {
        const point = event.points[0];
        if (!point) return;
        const sourcePointIndex = (point as PlotDatum & { pointNumbers?: number[] }).pointNumbers?.[0] ?? point.pointIndex;
        if (sourcePointIndex === undefined) return;
        const identity = getSeriesPointIdentity(figure.identityMaps, point.curveNumber, sourcePointIndex);
        publishHoverValues({
            [HoverTopic.REALIZATION]: identity?.realization ?? null,
            [HoverTopic.TIMESTAMP]: identity?.timestampUtcMs ?? null,
        });
    }

    function handleUnhover(): void {
        publishHoverValues({
            [HoverTopic.REALIZATION]: null,
            [HoverTopic.TIMESTAMP]: null,
        });
    }

    return (
        <BasePlot
            className="h-full w-full"
            data={figure.data}
            layout={figure.layout}
            config={{ displaylogo: false, responsive: true, displayModeBar: "hover" }}
            onHover={handleHover}
            onUnhover={handleUnhover}
            useResizeHandler
        />
    );
}
import React from "react";
import Plot from "react-plotly.js";

import { InplaceVolumetricData_api, InplaceVolumetricResponseNames_api } from "@api";
import { DataElement, KeyType } from "@framework/DataChannelTypes";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import { computeQuantile } from "@modules/_shared/statistics";

import { Layout, PlotData, PlotHoverEvent, Shape } from "plotly.js";

import { ChannelIds } from "./channelDefs";
import { useRealizationsResponseQuery } from "./queryHooks";
import { State } from "./state";
import { VolumetricResponseNamesMapping } from "./types";

export const View = (props: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const ensembleIdent = props.moduleContext.useStoreValue("ensembleIdent");
    const tableName = props.moduleContext.useStoreValue("tableName");
    const responseName = props.moduleContext.useStoreValue("responseName");
    const categoryFilter = props.moduleContext.useStoreValue("categoricalFilter");
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const subscribedPlotlyRealization = useSubscribedValue("global.hoverRealization", props.workbenchServices);
    const realizations = ensembleIdent ? ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() : null;

    const realizationsResponseQuery = useRealizationsResponseQuery(
        ensembleIdent?.getCaseUuid() ?? "",
        ensembleIdent?.getEnsembleName() ?? "",
        tableName,
        responseName as InplaceVolumetricResponseNames_api,
        realizations?.map((realization) => realization) ?? null,
        categoryFilter,
        true
    );
    const resultValues: number[] =
        realizationsResponseQuery.data?.result_per_realization.map((realData) => realData[1]) || [];
    const tracesDataArr: Partial<PlotData>[] = [];

    tracesDataArr.push(addHistogramTrace(resultValues));

    React.useEffect(() => {
        props.moduleContext.setInstanceTitle(
            VolumetricResponseNamesMapping[responseName as keyof typeof VolumetricResponseNamesMapping] || ""
        );
    }, [props.moduleContext, responseName]);

    const handleHover = (e: PlotHoverEvent) => {
        const realization = e.points[0].x;
        if (typeof realization === "number") {
            props.workbenchServices.publishGlobalData("global.hoverRealization", {
                realization: realization,
            });
        }
    };

    function handleUnHover() {
        props.workbenchServices.publishGlobalData("global.hoverRealization", { realization: -1 });
    }

    const ensemble = ensembleIdent ? props.workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent) : null;

    function dataGenerator() {
        const data: DataElement<KeyType.NUMBER>[] = [];
        if (realizationsResponseQuery.data) {
            realizationsResponseQuery.data.result_per_realization.forEach((realizationData) => {
                data.push({
                    key: realizationData[0],
                    value: realizationData[1],
                });
            });
        }
        return { data: data, metaData: { ensembleIdentString: ensembleIdent?.toString() ?? "" } };
    }

    props.moduleContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE,
        enabled: ensemble && tableName && responseName ? true : false,
        dependencies: [realizationsResponseQuery.data, ensemble, tableName, responseName],
        contents: [{ contentIdString: responseName ?? "", displayName: responseName ?? "", dataGenerator }],
    });
    const shapes: Partial<Shape>[] = resultValues.length > 0 ? addStatisticallines(resultValues) : [];
    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        margin: { t: 0, r: 0, l: 40, b: 40 },
        xaxis: { title: "Realization", range: [Math.min(...resultValues), Math.max(...resultValues)] },
        shapes: shapes,
    };
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <QueryStateWrapper
                queryResult={realizationsResponseQuery}
                loadingComponent={<CircularProgress />}
                errorComponent={"feil"}
            >
                <Plot
                    data={tracesDataArr}
                    layout={layout}
                    config={{ scrollZoom: true }}
                    onHover={handleHover}
                    onUnhover={handleUnHover}
                />
            </QueryStateWrapper>
        </div>
    );
};
interface HistogramPlotData extends Partial<PlotData> {
    nbinsx: number;
}

function addHistogramTrace(values: number[]): Partial<HistogramPlotData> {
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

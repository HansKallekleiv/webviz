import React from "react";

import { WellboreLogCurveInfo_api } from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { State } from "@modules/Pvt/state";
import { dataTagSymbol } from "@tanstack/react-query";
import { WellLogViewer } from "@webviz/well-log-viewer";
import { Template, TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";
import { TemplatePlotTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";
import {
    WellLog,
    WellLogCurve,
    WellLogDataRow,
    WellLogHeader,
} from "@webviz/well-log-viewer/dist/components/WellLogTypes";

import { isEqual } from "lodash";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { LogCurveResult } from "../typesAndEnums";

export const colorTables = [
    {
        name: "Physics",
        discrete: false,
        description: "Full options color table",
        colorNaN: [255, 255, 255],
        colorBelow: [255, 0.0, 0.0],
        colorAbove: [0.0, 0.0, 255],
        colors: [
            [0.0, 255, 0, 0],
            [0.25, 255, 255, 0],
            [0.5, 0, 255, 0],
            [0.75, 0, 255, 255],
            [1.0, 0, 0, 255],
        ],
    },
];
export function View(props: ModuleViewProps<State, SettingsToViewInterface>) {
    const statusWriter = useViewStatusWriter(props.viewContext);

    const logCurvesDataQueries = props.viewContext.useSettingsToViewInterfaceValue("logCurvesDataQueries");

    if (logCurvesDataQueries.allQueriesFailed) {
        statusWriter.addError("Failed to load wellbore log curve data");
    }
    const logData = createWellLogData(logCurvesDataQueries.curvesData);
    const template = createTemplate(logCurvesDataQueries.curvesData);
    return (
        <div style={{ height: "92vh", display: "flex", flexDirection: "column" }}>
            <div style={{ width: "100%", height: "100%", flex: 1 }}>
                <WellLogViewer
                    id="well-log-viewer"
                    welllog={logData}
                    options={{
                        hideTrackTitle: false,
                        hideTrackLegend: false,
                        maxVisibleTrackNum: 10,
                    }}
                    primaryAxis={"MD"}
                    axisMnemos={{ md: ["MD"] }}
                    colorTables={colorTables as any}
                    template={template}
                    viewTitle={true}
                    axisTitles={{}}
                />
            </div>
        </div>
    );
}
function createWellLogData(logCurvesDataQueries: LogCurveResult[]): WellLog {
    if (logCurvesDataQueries.length === 0) {
        return {
            header: createWellLogHeader(),
            curves: [],
            data: [],
            metadata_discrete: {},
        };
    }
    const header: WellLogHeader = createWellLogHeader();
    const curves: WellLogCurve[] = logCurvesDataQueries.map((logCurveData) => {
        return createLogCurveHeader(logCurveData);
    });
    const data: WellLogDataRow[] = createLogCurvesData(logCurvesDataQueries);
    const metadata_discrete = {};
    return { header, curves, data, metadata_discrete };
}

function createWellLogHeader(): WellLogHeader {
    return { name: "header" };
}
function createLogCurveHeader(logCurveData: LogCurveResult): WellLogCurve {
    return { name: logCurveData.logCurveName };
}
function createLogCurvesData(logCurveResults: LogCurveResult[]): WellLogDataRow[] {
    const md: (number | null)[] = [];
    if (logCurveResults.length === 0) {
        return [];
    }
    if (!logCurveResults[0]?.data) {
        return [];
    }
    logCurveResults[0].data?.value_arr.forEach((value, idx) => {
        md.push(value);
    });
    const data: WellLogDataRow[] = [];
    for (let i = 0; i < md.length; i++) {
        const row: WellLogDataRow = [];
        row.push(md[i]);
        logCurveResults.forEach((logCurveResult) => {
            if (logCurveResult.data) {
                row.push(logCurveResult.data?.value_arr[i]);
            }
        });
        data.push(row);
    }

    return data;
}
function createTemplate(logCurveHeaders: LogCurveResult[]): Template {
    const tracks: TemplateTrack[] = [];
    tracks.push({ title: "MD", plots: [{ name: "MD", type: "line", color: "black" }] });
    logCurveHeaders.forEach((logCurveHeader) => {
        tracks.push({
            title: logCurveHeader.logCurveName,
            plots: [{ name: logCurveHeader.logCurveName, type: "line", color: "red" }],
        });
    });
    return {
        name: "Template",
        scale: { primary: "MD" },
        tracks: tracks,
    };
}

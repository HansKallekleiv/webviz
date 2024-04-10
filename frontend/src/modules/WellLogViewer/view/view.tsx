import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { State } from "@modules/Pvt/state";
import { WellLogViewer } from "@webviz/well-log-viewer";
import { Template } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";
import {
    WellLog,
    WellLogCurve,
    WellLogDataRow,
    WellLogHeader,
} from "@webviz/well-log-viewer/dist/components/WellLogTypes";

import { isEqual } from "lodash";

import { SettingsToViewInterface } from "../settingsToViewInterface";

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
    console.log(logCurvesDataQueries);
    const wellLogComponentRef = React.useRef<HTMLDivElement>(null);

    let wellLogs: any = null;
    let wellLogNames: string[] = [];
    let template: any = null;

    const [currentLogs, setCurrentLogs] = React.useState(null);
    const [currentTemplate, setCurrentTemplate] = React.useState(null);

    if (wellLogs && !isEqual(wellLogs, currentLogs)) {
        setCurrentLogs(wellLogs);
    }
    if (template && !isEqual(template, currentTemplate)) {
        setCurrentTemplate(template);
    }
    // if (currentLogs === null || currentTemplate === null) {
    //     return <div>No data</div>;
    // }
    return (
        <div style={{ height: "92vh", display: "flex", flexDirection: "column" }}>
            <div style={{ width: "100%", height: "100%", flex: 1 }}>
                <WellLogViewer
                    id="well-log-viewer"
                    welllog={createWellLogData(logCurvesDataQueries)}
                    options={{
                        hideTrackTitle: false,
                        hideTrackLegend: false,
                        maxVisibleTrackNum: 10,
                    }}
                    primaryAxis={"TVD"}
                    axisMnemos={{ TVD: ["TVD"] }}
                    colorTables={colorTables as any}
                    template={createTemplate()}
                    viewTitle={true}
                    axisTitles={{}}
                    // onCreateController={onCreateController}
                />
            </div>
        </div>
    );
}
function createWellLogData(logCurvesDataQueries: any): WellLog {
    const header: WellLogHeader = {};
    const curves: WellLogCurve[] = [];
    const data: WellLogDataRow[] = [];
    const metadata_discrete = {};
    return { header, curves, data, metadata_discrete };
}

function createTemplate(): Template {
    return {
        name: "Template",
        scale: { primary: "linear" },
        tracks: [],
    };
}

import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleType } from "@lib/utils/ColorScale";
import { WellLogViewer } from "@webviz/well-log-viewer";

import { create, isEqual } from "lodash";
import { PlotData } from "plotly.js";

import { useBlockedWellLogs } from "./queryHooks";
import { State } from "./state";
import { colorTables, createTemplate, wellLogsToJson } from "./utils/wellLog";

export const View = (props: ModuleFCProps<State>) => {
    const ref = React.useRef<HTMLDivElement>(null);

    const ensembleIdent = props.moduleContext.useStoreValue("ensembleIdent");
    const wellName = props.moduleContext.useStoreValue("wellName");

    const wellLogQuery = useBlockedWellLogs(
        ensembleIdent?.getCaseUuid() || null,
        ensembleIdent?.getEnsembleName() || null,
        wellName || null
    );
    let wellLogs: any = null;
    let wellLogNames: string[] = [];
    let template: any = null;
    if (wellLogQuery.data) {
        wellLogs = wellLogsToJson(wellName || "", wellLogQuery?.data || []);
        wellLogNames = wellLogQuery.data ? wellLogQuery.data.map((log: any) => log.well_log_name) : [];
        template = createTemplate(wellLogNames);
    }
    const [currentLogs, setCurrentLogs] = React.useState(null);
    const [currentTemplate, setCurrentTemplate] = React.useState(null);

    if (wellLogs && !isEqual(wellLogs, currentLogs)) {
        setCurrentLogs(wellLogs);
    }
    if (template && !isEqual(template, currentTemplate)) {
        setCurrentTemplate(template);
    }
    if (currentLogs === null || currentTemplate === null) {
        return <div>No data</div>;
    }

    function onCreateController(controller: any) {
        console.log("controller created", controller);
    }
    return (
        // <div ref={ref} className="w-full h-full">
        <div style={{ height: "92vh", display: "flex", flexDirection: "column" }}>
            <div style={{ width: "100%", height: "100%", flex: 1 }}>
                <WellLogViewer
                    id="well-log-viewer"
                    welllog={currentLogs}
                    options={{
                        hideTrackTitle: false,
                        hideTrackLegend: false,
                        maxVisibleTrackNum: 10,
                    }}
                    primaryAxis={"TVD"}
                    axisMnemos={{ TVD: ["TVD"] }}
                    colorTables={colorTables as any}
                    template={currentTemplate}
                    viewTitle={true}
                    axisTitles={{}}
                    onCreateController={onCreateController}
                    onTrackMouseEvent={(e: any) => console.log(e)}
                    onContentSelection={(e) => console.log(e)}
                    onInfo={(x: number, logController: any, iFrom: number, iTo: number) =>
                        console.log(x, logController, iFrom, iTo)
                    }
                    onContentRescale={() => console.log("rescale")}
                />
            </div>
        </div>
        // </div>
    );
};

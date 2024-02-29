import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import { WellLogView, WellLogViewer } from "@webviz/well-log-viewer";
import { WellLogController } from "@webviz/well-log-viewer/dist/components/WellLogView";

import { isEqual } from "lodash";

import { useBlockedWellLogs } from "./queryHooks";
import { State } from "./state";
import { colorTables, createTemplate, wellLogsToJson } from "./utils/wellLog";

export const View = (props: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const syncedSettingKeys = props.moduleContext.useSyncedSettingKeys();

    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const [controller, setController] = React.useState<WellLogController | null>(null);
    const ensembleIdent = props.moduleContext.useStoreValue("ensembleIdent");
    const wellName = props.moduleContext.useStoreValue("wellName");
    const [tvd, setTvd] = React.useState<number | null>(null);
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

    const handleCreateController = (newController: WellLogController) => {
        setController(newController);
        console.log("controller created", newController);
    };

    function handleInfosChange(x: number, logController: any, iFrom: number, iTo: number) {
        if (wellName && x) {
            syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", {
                wellbore: { type: "smda", uwi: wellName, uuid: wellName },
                tvd: x,
            });
        }
    }
    return (
        // <div ref={wrapperDivRef} className="w-full h-full">
        // <div style={{ height: "92vh", display: "flex", flexDirection: "column" }}>
        //     <div style={{ width: "100%", height: "100%", flex: 1 }}>
        <WellLogView
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
            onCreateController={handleCreateController}
            onTrackMouseEvent={(e: any) => console.log(e)}
            onInfo={handleInfosChange}
        />
        //     </div>
        // </div>
        // </div>
    );
};

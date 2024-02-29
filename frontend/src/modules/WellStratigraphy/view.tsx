import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import { useWellTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { WellLogView, WellLogViewer } from "@webviz/well-log-viewer";
import { Info } from "@webviz/well-log-viewer/dist/components/InfoTypes";
import { WellLogController } from "@webviz/well-log-viewer/dist/components/WellLogView";
import { fillInfos } from "@webviz/well-log-viewer/dist/utils/fill-info";

import { log } from "console";
import { isEqual } from "lodash";

import { useBlockedWellLogs } from "./queryHooks";
import { State } from "./state";
import { colorTables, createTemplate, wellLogsToJson } from "./utils/wellLog";

export const View = (props: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const syncedSettingKeys = props.moduleContext.useSyncedSettingKeys();

    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const wellboreAddress = props.moduleContext.useStoreValue("wellboreAddress");
    console.log(wellboreAddress);
    const [tvd, setTvd] = React.useState<number | null>(null);
    // Get well trajectories query
    const wellTrajectoriesQuery = useWellTrajectoriesQuery(wellboreAddress ? [wellboreAddress.uuid] : undefined);

    let wellLogs: any = null;
    let template: any = null;
    let wellName: string | null = null;
    if (wellTrajectoriesQuery.data) {
        wellName = wellTrajectoriesQuery.data[0]?.unique_wellbore_identifier;
        wellLogs = wellLogsToJson(
            wellName || "",
            wellTrajectoriesQuery.data[0].tvd_msl_arr,
            wellTrajectoriesQuery.data[0].md_arr
        );

        template = createTemplate();
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

    function handleInfosChange(x: number, logController: any, iFrom: number, iTo: number) {
        let infos: Info[] | null = null;
        if (x && logController) {
            infos = fillInfos(x, logController, iFrom, iTo, []);
        }
        if (wellName && infos) {
            const mdValue = infos.find((info) => info.name === "MD")?.value;
            const tvdValue = infos.find((info) => info.name === "TVD")?.value;
            syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", {
                wellbore: { type: "smda", uwi: wellName, uuid: wellName },
                tvd: tvdValue || null,
                md: mdValue || null,
            });
        }
    }

    return (
        <div ref={wrapperDivRef} className="w-full h-full">
            <WellLogView
                container={wrapperDivRef.current}
                id="well-log-viewer"
                welllog={currentLogs}
                options={{
                    hideTrackTitle: false,
                    hideTrackLegend: false,
                    maxVisibleTrackNum: 10,
                }}
                primaryAxis={"MD"}
                axisMnemos={{ TVD: ["TVD"], MD: ["MD"] }}
                colorTables={colorTables as any}
                template={currentTemplate}
                viewTitle={true}
                axisTitles={{}}
                onTrackMouseEvent={(e: any) => console.log(e)}
                onInfo={handleInfosChange}
                horizontal={true}
            />
        </div>
    );
};

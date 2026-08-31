import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { usePersistedDataProviderManager } from "@framework/dataProviderFramework/hooks/usePersistedDataProviderManager";
import type { ModuleSettingsProps } from "@framework/Module";

import { applyChartViewerPreset, ChartViewerPreset } from "../presets";

import { dataProviderManagerAtom, dataProviderStateAtom } from "./atoms";
import { DataProviderManagerWrapper } from "./DataProviderManagerWrapper";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const queryClient = useQueryClient();
    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);
    const [dataProviderState, setDataProviderState] = useAtom(dataProviderStateAtom);

    usePersistedDataProviderManager({
        setDataProviderManager,
        serializedState: dataProviderState,
        setSerializedState: setDataProviderState,
        workbenchSession: props.workbenchSession,
        workbenchSettings: props.workbenchSettings,
        queryClient,
    });

    React.useEffect(
        function initializeNewModule() {
            if (!dataProviderManager || dataProviderState || dataProviderManager.getGroupDelegate().getChildren().length) {
                return;
            }
            applyChartViewerPreset(dataProviderManager, ChartViewerPreset.TIME_SERIES);
        },
        [dataProviderManager, dataProviderState],
    );

    if (!dataProviderManager) return null;

    return (
        <div className="flex h-full w-full flex-col px-xs py-xs">
            <DataProviderManagerWrapper
                dataProviderManager={dataProviderManager}
                workbenchSettings={props.workbenchSettings}
                onApplyPreset={(preset) => applyChartViewerPreset(dataProviderManager, preset)}
            />
        </div>
    );
}

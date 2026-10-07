import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { usePersistedDataProviderManager } from "@framework/dataProviderFramework/hooks/usePersistedDataProviderManager";
import type { ModuleSettingsProps } from "@framework/Module";

import { ALLOWED_VISUALIZATION_KINDS } from "../config";
import type { ChartViewerMode } from "../config";

import { dataProviderManagerAtom, dataProviderStateAtom } from "./atoms";
import { DataProviderManagerWrapper } from "./DataProviderManagerWrapper";

export type SettingsProps = ModuleSettingsProps<any> & {
    mode: ChartViewerMode;
};

export function Settings(props: SettingsProps): React.ReactNode {
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
        function onModeChangedEffect() {
            dataProviderManager?.updateGlobalSetting(
                "allowedVisualizationKinds",
                ALLOWED_VISUALIZATION_KINDS[props.mode],
            );
        },
        [dataProviderManager, props.mode],
    );

    if (!dataProviderManager) return null;

    return (
        <div className="flex h-full w-full flex-col px-xs py-xs">
            <DataProviderManagerWrapper
                dataProviderManager={dataProviderManager}
                workbenchSettings={props.workbenchSettings}
                mode={props.mode}
            />
        </div>
    );
}
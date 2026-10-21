import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { FieldDropdown } from "@framework/components/FieldDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Setting } from "@lib/components/Setting";
import type { DataProviderManagerOptions } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { usePersistedDataProviderManager } from "@modules/_shared/DataProviderFramework/hooks/usePersistedDataProviderManager";

import { dataProviderManagerAtom, dataProviderStateAtom } from "./atoms/baseAtoms";
import { fieldIdentifierAtom } from "./atoms/persistableFixableAtoms";
import { DataProviderManagerWrapper } from "./components/dataProviderManagerWrapper";

// A depth delta has no meaningful 3D geometry (z would be the difference), so delta ensembles are 2D-only
const DATA_PROVIDER_MANAGER_OPTIONS: DataProviderManagerOptions = { allowDeltaEnsembles: false };

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const queryClient = useQueryClient();

    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);
    const [dataProviderState, setDataProviderState] = useAtom(dataProviderStateAtom);

    const [fieldIdentifier, setFieldIdentifier] = useAtom(fieldIdentifierAtom);

    usePersistedDataProviderManager({
        setDataProviderManager,
        serializedState: dataProviderState,
        setSerializedState: setDataProviderState,
        workbenchSession: props.workbenchSession,
        workbenchSettings: props.workbenchSettings,
        queryClient,
        managerOptions: DATA_PROVIDER_MANAGER_OPTIONS,
    });

    React.useEffect(
        function onFieldIdentifierChangedEffect() {
            if (!dataProviderManager) {
                return;
            }
            dataProviderManager.updateGlobalSetting("fieldId", fieldIdentifier.value);
        },
        [fieldIdentifier, dataProviderManager],
    );

    function handleFieldChange(fieldId: string | null) {
        setFieldIdentifier(fieldId);
        if (!dataProviderManager) {
            return;
        }
        dataProviderManager.updateGlobalSetting("fieldId", fieldId);
    }

    return (
        <div className="gap-y-xs px-xs py-xs flex h-full flex-col">
            <Setting.Panel>
                <Setting.Field label="Field">
                    <FieldDropdown
                        ensembleSet={ensembleSet}
                        onChange={handleFieldChange}
                        value={fieldIdentifier.value}
                    />
                </Setting.Field>
            </Setting.Panel>
            {dataProviderManager && (
                <DataProviderManagerWrapper
                    dataProviderManager={dataProviderManager}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            )}
        </div>
    );
}

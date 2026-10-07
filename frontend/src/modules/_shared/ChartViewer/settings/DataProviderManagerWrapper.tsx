import type React from "react";

import { Add, BarChart, Settings } from "@mui/icons-material";

import type { ActionGroup } from "@framework/dataProviderFramework/Actions";
import { DataProviderRegistry } from "@framework/dataProviderFramework/dataProviders/DataProviderRegistry";
import type { GroupDelegate } from "@framework/dataProviderFramework/delegates/GroupDelegate";
import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerComponent } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import { SharedSetting } from "@framework/dataProviderFramework/framework/SharedSetting/SharedSetting";
import { GroupRegistry } from "@framework/dataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@framework/dataProviderFramework/groups/groupTypes";
import {
    canAddProviderTypeToPlotView,
    isMoveIntoPlotViewAllowed,
    isPlotView,
} from "@framework/dataProviderFramework/groups/implementations/plotViewCompatibility";
import type { ItemGroup } from "@framework/dataProviderFramework/interfacesAndTypes/entities";
import { useColorSet } from "@framework/WorkbenchSettings";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";

import { PROVIDER_ACTIONS, SETTING_ACTIONS } from "../config";
import type { ChartViewerMode } from "../config";

export type DataProviderManagerWrapperProps = {
    dataProviderManager: DataProviderManager;
    workbenchSettings: WorkbenchSettings;
    mode: ChartViewerMode;
};

export function DataProviderManagerWrapper(props: DataProviderManagerWrapperProps): React.ReactNode {
    const colorSet = useColorSet(props.workbenchSettings);
    const rootGroupDelegate = props.dataProviderManager.getGroupDelegate();

    function addPlotView(groupDelegate: GroupDelegate): void {
        groupDelegate.appendChild(
            GroupRegistry.makeGroup(GroupType.PLOT_VIEW, props.dataProviderManager, colorSet.getNextColor()),
        );
    }

    function handleAction(identifier: string, groupDelegate: GroupDelegate): void {
        if (identifier === "plot-view") {
            addPlotView(groupDelegate);
            return;
        }
        const providerAction = PROVIDER_ACTIONS[props.mode].find((action) => action.identifier === identifier);
        if (providerAction) {
            groupDelegate.appendChild(
                DataProviderRegistry.makeDataProvider(providerAction.type, props.dataProviderManager),
            );
            return;
        }
        const settingAction = SETTING_ACTIONS[props.mode].find((action) => action.identifier === identifier);
        if (settingAction) {
            groupDelegate.prependChild(new SharedSetting(settingAction.setting, null, props.dataProviderManager));
        }
    }

    function makeActionsForGroup(group: ItemGroup): ActionGroup[] {
        if (group === props.dataProviderManager) return [PLOT_VIEW_ACTION, makeSharedSettingsActions(props.mode)];
        if (isPlotView(group)) {
            return [makeProviderActionGroup(props.mode, group), makeSharedSettingsActions(props.mode)];
        }
        return [];
    }

    return (
        <DataProviderManagerComponent
            title="Charts"
            dataProviderManager={props.dataProviderManager}
            groupActions={makeActionsForGroup}
            onAction={handleAction}
            isMoveAllowed={isMoveIntoPlotViewAllowed}
            additionalHeaderComponents={null}
            emptyContentPlaceholder={
                <Button tone="accent" onClick={() => addPlotView(rootGroupDelegate)}>
                    <Add fontSize="small" /> Add chart
                </Button>
            }
        />
    );
}

const PLOT_VIEW_ACTION: ActionGroup = {
    label: "Groups",
    children: [{ identifier: "plot-view", icon: <BarChart fontSize="small" />, label: "Chart" }],
};

function makeProviderActionGroup(mode: ChartViewerMode, plotView: ItemGroup): ActionGroup {
    return {
        label: "Data",
        children: PROVIDER_ACTIONS[mode].map((action) => {
            const compatibility = canAddProviderTypeToPlotView(action.type, plotView);
            return {
                identifier: action.identifier,
                icon: <BarChart fontSize="small" />,
                label: action.label,
                disabled: !compatibility.allowed,
                disabledReason: compatibility.reason,
            };
        }),
    };
}

function makeSharedSettingsActions(mode: ChartViewerMode): ActionGroup {
    return {
        label: "Shared settings",
        children: SETTING_ACTIONS[mode].map((action) => ({
            identifier: action.identifier,
            icon: <Settings fontSize="small" />,
            label: action.label,
        })),
    };
}
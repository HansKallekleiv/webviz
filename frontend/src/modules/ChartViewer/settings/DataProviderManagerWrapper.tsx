import type React from "react";

import { Add, BarChart, Settings, ShowChart } from "@mui/icons-material";

import type { ActionGroup } from "@framework/dataProviderFramework/Actions";
import { DataProviderRegistry } from "@framework/dataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@framework/dataProviderFramework/dataProviders/dataProviderTypes";
import type { GroupDelegate } from "@framework/dataProviderFramework/delegates/GroupDelegate";
import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerComponent } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import { Group } from "@framework/dataProviderFramework/framework/Group/Group";
import { SharedSetting } from "@framework/dataProviderFramework/framework/SharedSetting/SharedSetting";
import { GroupRegistry } from "@framework/dataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@framework/dataProviderFramework/groups/groupTypes";
import type { ItemGroup } from "@framework/dataProviderFramework/interfacesAndTypes/entities";
import { Setting } from "@framework/dataProviderFramework/settings/settingsDefinitions";
import { useColorSet } from "@framework/WorkbenchSettings";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";

import { ChartViewerPreset } from "../presets";

export type DataProviderManagerWrapperProps = {
    dataProviderManager: DataProviderManager;
    workbenchSettings: WorkbenchSettings;
    onApplyPreset: (preset: ChartViewerPreset) => void;
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
        const providerType = PROVIDER_ACTIONS[identifier];
        if (providerType) {
            groupDelegate.appendChild(DataProviderRegistry.makeDataProvider(providerType, props.dataProviderManager));
            return;
        }
        const setting = SETTING_ACTIONS[identifier];
        if (setting) {
            groupDelegate.prependChild(new SharedSetting(setting, null, props.dataProviderManager));
        }
    }

    function makeActionsForGroup(group: ItemGroup): ActionGroup[] {
        if (group === props.dataProviderManager) return [PLOT_VIEW_ACTION, SHARED_SETTINGS_ACTIONS];
        if (group instanceof Group && group.getGroupType() === GroupType.PLOT_VIEW) {
            return [PROVIDER_ACTION_GROUP, SHARED_SETTINGS_ACTIONS];
        }
        return [];
    }

    return (
        <DataProviderManagerComponent
            title="Charts"
            dataProviderManager={props.dataProviderManager}
            groupActions={makeActionsForGroup}
            onAction={handleAction}
            additionalHeaderComponents={
                <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => props.onApplyPreset(ChartViewerPreset.TIME_SERIES)}>
                        <ShowChart fontSize="small" /> Time series
                    </Button>
                    <Button variant="ghost" onClick={() => props.onApplyPreset(ChartViewerPreset.DISTRIBUTION)}>
                        <BarChart fontSize="small" /> Distribution
                    </Button>
                </div>
            }
            emptyContentPlaceholder={
                <Button tone="accent" onClick={() => addPlotView(rootGroupDelegate)}>
                    <Add fontSize="small" /> Add chart
                </Button>
            }
        />
    );
}

const PROVIDER_ACTIONS: Partial<Record<string, DataProviderType>> = {
    "summary-vector": DataProviderType.SUMMARY_VECTOR,
    "summary-history": DataProviderType.SUMMARY_VECTOR_HISTORY,
    "summary-observations": DataProviderType.SUMMARY_VECTOR_OBSERVATIONS,
    "inplace-volumes": DataProviderType.INPLACE_VOLUMES,
};

const SETTING_ACTIONS: Partial<Record<string, Setting>> = {
    ensemble: Setting.ENSEMBLE,
    realizations: Setting.REALIZATIONS,
    "vector-name": Setting.VECTOR_NAME,
    frequency: Setting.VECTOR_RESAMPLING_FREQUENCY,
    representation: Setting.REPRESENTATION,
    grid: Setting.GRID_NAME,
    result: Setting.INPLACE_RESULT,
    zone: Setting.ZONE,
    region: Setting.REGION,
    facies: Setting.FACIES,
    license: Setting.LICENSE,
};

const PLOT_VIEW_ACTION: ActionGroup = {
    label: "Groups",
    children: [{ identifier: "plot-view", icon: <BarChart fontSize="small" />, label: "Chart" }],
};

const PROVIDER_ACTION_GROUP: ActionGroup = {
    label: "Data",
    children: [
        { identifier: "summary-vector", icon: <BarChart fontSize="small" />, label: "Summary vector" },
        { identifier: "summary-history", icon: <BarChart fontSize="small" />, label: "Summary history" },
        { identifier: "summary-observations", icon: <BarChart fontSize="small" />, label: "Observations" },
        { identifier: "inplace-volumes", icon: <BarChart fontSize="small" />, label: "In-place volumes" },
    ],
};

const SHARED_SETTINGS_ACTIONS: ActionGroup = {
    label: "Shared settings",
    children: Object.keys(SETTING_ACTIONS).map((identifier) => ({
        identifier,
        icon: <Settings fontSize="small" />,
        label: identifier.replaceAll("-", " "),
    })),
};

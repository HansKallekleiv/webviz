import { DataProviderRegistry } from "@framework/dataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@framework/dataProviderFramework/dataProviders/dataProviderTypes";
import { VisualizationKind } from "@framework/dataProviderFramework/dataProviders/visualizationKinds";
import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { SharedSetting } from "@framework/dataProviderFramework/framework/SharedSetting/SharedSetting";
import { GroupRegistry } from "@framework/dataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@framework/dataProviderFramework/groups/groupTypes";
import { Setting } from "@framework/dataProviderFramework/settings/settingsDefinitions";

export enum ChartViewerPreset {
    TIME_SERIES = "time-series",
    DISTRIBUTION = "distribution",
}

export function applyChartViewerPreset(manager: DataProviderManager, preset: ChartViewerPreset): void {
    const root = manager.getGroupDelegate();
    root.clearChildren();
    root.appendChild(new SharedSetting(Setting.ENSEMBLE, null, manager));

    const plotView = GroupRegistry.makeGroup(GroupType.PLOT_VIEW, manager, manager.makeGroupColor());
    const visualizationKind =
        preset === ChartViewerPreset.TIME_SERIES ? VisualizationKind.TIME_SERIES : VisualizationKind.HISTOGRAM;
    plotView.getGroupDelegate().appendChild(
        DataProviderRegistry.makeDataProvider(
            preset === ChartViewerPreset.TIME_SERIES
                ? DataProviderType.SUMMARY_VECTOR
                : DataProviderType.INPLACE_VOLUMES,
            manager,
        ),
    );
    plotView.getWrappedSettings()[Setting.VISUALIZATION_KIND].setValue(visualizationKind);
    root.appendChild(plotView);
}

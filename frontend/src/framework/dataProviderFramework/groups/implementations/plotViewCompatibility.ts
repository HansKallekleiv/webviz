import { DataProviderRegistry } from "../../dataProviders/DataProviderRegistry";
import { isDataProvider } from "../../framework/DataProvider/DataProvider";
import { isGroup } from "../../framework/Group/Group";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { GroupType } from "../groupTypes";

import { getCompatibleVisualizationKinds, intersectVisualizationKinds } from "./PlotView";

export type PlotViewCompatibility = {
    allowed: boolean;
    reason?: string;
};

export function isPlotView(item: Item): item is ItemGroup {
    return isGroup(item) && item.getGroupType() === GroupType.PLOT_VIEW;
}

/** A provider type fits a PlotView if it shares at least one kind with the view's current constraint. */
export function canAddProviderTypeToPlotView(providerType: string, plotView: ItemGroup): PlotViewCompatibility {
    const providers = plotView.getGroupDelegate().getDescendantItems(isDataProvider).filter(isDataProvider);
    const allowedKinds = plotView
        .getItemDelegate()
        .getDataProviderManager()
        .getGlobalSetting("allowedVisualizationKinds");
    const currentKinds = getCompatibleVisualizationKinds(providers, allowedKinds);
    const providerKinds = DataProviderRegistry.getCompatibleVisualizationKinds(providerType);

    if (intersectVisualizationKinds([providerKinds], currentKinds).length > 0) {
        return { allowed: true };
    }
    return {
        allowed: false,
        reason: `Not compatible with this chart (supports ${currentKinds.join("/") || "no visualization"})`,
    };
}

export function isMoveIntoPlotViewAllowed(movedItem: Item, destination: ItemGroup): boolean {
    if (!isDataProvider(movedItem) || !isPlotView(destination)) return true;
    return canAddProviderTypeToPlotView(movedItem.getType(), destination).allowed;
}

import { afterEach, describe, expect, test } from "vitest";

import { DataProviderRegistry } from "@framework/dataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@framework/dataProviderFramework/dataProviders/dataProviderTypes";
import { VisualizationKind } from "@framework/dataProviderFramework/dataProviders/visualizationKinds";
import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { Group } from "@framework/dataProviderFramework/framework/Group/Group";
import { GroupRegistry } from "@framework/dataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@framework/dataProviderFramework/groups/groupTypes";
import {
    canAddProviderTypeToPlotView,
    isMoveIntoPlotViewAllowed,
} from "@framework/dataProviderFramework/groups/implementations/plotViewCompatibility";
import { ALLOWED_VISUALIZATION_KINDS, ChartViewerMode } from "@modules/_shared/ChartViewer/config";

import { makeStubDataProviderManager } from "../utils/stubDataProviderManager";

let manager: DataProviderManager;

afterEach(() => manager?.beforeDestroy());

function addPlotView(): Group<any, any> {
    const plotView = GroupRegistry.makeGroup(GroupType.PLOT_VIEW, manager, manager.makeGroupColor());
    manager.getGroupDelegate().appendChild(plotView);
    return plotView;
}

function addProvider(group: Group<any, any>, type: DataProviderType) {
    const provider = DataProviderRegistry.makeDataProvider(type, manager);
    group.getGroupDelegate().appendChild(provider);
    return provider;
}

describe("PlotView provider compatibility (D5)", () => {
    test("reads compatible kinds by provider type", () => {
        expect(DataProviderRegistry.getCompatibleVisualizationKinds(DataProviderType.SUMMARY_VECTOR)).toEqual([
            VisualizationKind.TIME_SERIES,
        ]);
        expect(DataProviderRegistry.getCompatibleVisualizationKinds(DataProviderType.INPLACE_VOLUMES)).toEqual([
            VisualizationKind.HISTOGRAM,
            VisualizationKind.BOX,
            VisualizationKind.BAR,
            VisualizationKind.CONVERGENCE,
            VisualizationKind.TABLE,
        ]);
    });

    test("accepts any provider in an empty, unrestricted chart", () => {
        manager = makeStubDataProviderManager();
        const plotView = addPlotView();

        expect(canAddProviderTypeToPlotView(DataProviderType.SUMMARY_VECTOR, plotView).allowed).toBe(true);
        expect(canAddProviderTypeToPlotView(DataProviderType.INPLACE_VOLUMES, plotView).allowed).toBe(true);
    });

    test("refuses an in-place provider next to a summary vector provider", () => {
        manager = makeStubDataProviderManager();
        const plotView = addPlotView();
        addProvider(plotView, DataProviderType.SUMMARY_VECTOR);

        expect(canAddProviderTypeToPlotView(DataProviderType.SUMMARY_VECTOR_HISTORY, plotView)).toEqual({
            allowed: true,
        });
        expect(canAddProviderTypeToPlotView(DataProviderType.INPLACE_VOLUMES, plotView)).toEqual({
            allowed: false,
            reason: "Not compatible with this chart (supports time-series)",
        });
    });

    test("refuses a summary vector provider next to an in-place provider", () => {
        manager = makeStubDataProviderManager();
        const plotView = addPlotView();
        addProvider(plotView, DataProviderType.INPLACE_VOLUMES);

        const result = canAddProviderTypeToPlotView(DataProviderType.SUMMARY_VECTOR, plotView);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("histogram/box/bar/convergence/table");
    });

    test("applies the module's allowed kinds to an empty chart", () => {
        manager = makeStubDataProviderManager();
        manager.updateGlobalSetting(
            "allowedVisualizationKinds",
            ALLOWED_VISUALIZATION_KINDS[ChartViewerMode.DISTRIBUTION],
        );
        const plotView = addPlotView();

        expect(canAddProviderTypeToPlotView(DataProviderType.INPLACE_VOLUMES, plotView).allowed).toBe(true);
        expect(canAddProviderTypeToPlotView(DataProviderType.SUMMARY_VECTOR, plotView).allowed).toBe(false);
    });

    test("refuses moving a provider into an incompatible chart", () => {
        manager = makeStubDataProviderManager();
        const timeSeriesView = addPlotView();
        const distributionView = addPlotView();
        const summaryProvider = addProvider(timeSeriesView, DataProviderType.SUMMARY_VECTOR);
        const inplaceProvider = addProvider(distributionView, DataProviderType.INPLACE_VOLUMES);

        expect(isMoveIntoPlotViewAllowed(summaryProvider, distributionView)).toBe(false);
        expect(isMoveIntoPlotViewAllowed(inplaceProvider, timeSeriesView)).toBe(false);
        expect(isMoveIntoPlotViewAllowed(summaryProvider, timeSeriesView)).toBe(true);
        expect(isMoveIntoPlotViewAllowed(summaryProvider, manager)).toBe(true);
    });
});

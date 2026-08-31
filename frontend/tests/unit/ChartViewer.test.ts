import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import { DataProviderType } from "@framework/dataProviderFramework/dataProviders/dataProviderTypes";
import { VisualizationKind } from "@framework/dataProviderFramework/dataProviders/visualizationKinds";
import { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupRegistry } from "@framework/dataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@framework/dataProviderFramework/groups/groupTypes";
import { Setting } from "@framework/dataProviderFramework/settings/settingsDefinitions";
import { makePlotVisualizationAssembler } from "@framework/dataProviderFramework/visualization/plotAssembler";
import { PlotDimension } from "@framework/dataProviderFramework/visualization/plotTypes";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import { ChartViewerMode, PROVIDER_ACTIONS, SETTING_ACTIONS } from "@modules/_shared/ChartViewer/config";
import {
    collectPlotGroups,
    makePlotChannelContents,
    type PlotVisualizationGroup,
} from "@modules/_shared/ChartViewer/view/plotChannelContents";

function makeManager(): DataProviderManager {
    const sessionDelegate = new PublishSubscribeDelegate();
    const workbenchSession = {
        getEnsembleSet: () => ({ getRegularEnsembleArray: () => [] as RegularEnsemble[] }),
        getRealizationFilterSet: () => ({
            getRealizationFilterForEnsembleIdent: () => ({ getFilteredRealizations: () => [] }),
        }),
        getUserCreatedItems: () => ({
            getIntersectionPolylines: () => ({
                getPolylines: () => [],
                subscribe: () => () => undefined,
            }),
        }),
        getPublishSubscribeDelegate: () => sessionDelegate,
    } as unknown as WorkbenchSession;
    const workbenchSettings = {
        getSelectedColorPalette: () => ({ getColors: () => ["#123456"] }),
    } as unknown as WorkbenchSettings;
    return new DataProviderManager(workbenchSession, workbenchSettings, {} as QueryClient);
}

describe("ChartViewer", () => {
    test("restricts providers by module mode", () => {
        expect(PROVIDER_ACTIONS[ChartViewerMode.TIME_SERIES].map((action) => action.type)).toEqual([
            DataProviderType.SUMMARY_VECTOR,
            DataProviderType.SUMMARY_VECTOR_HISTORY,
            DataProviderType.SUMMARY_VECTOR_OBSERVATIONS,
        ]);
        expect(PROVIDER_ACTIONS[ChartViewerMode.DISTRIBUTION].map((action) => action.type)).toEqual([
            DataProviderType.INPLACE_VOLUMES,
        ]);
    });

    test("restricts shared settings by module mode", () => {
        const timeSeriesSettings = SETTING_ACTIONS[ChartViewerMode.TIME_SERIES].map((action) => action.setting);
        const distributionSettings = SETTING_ACTIONS[ChartViewerMode.DISTRIBUTION].map((action) => action.setting);

        expect(timeSeriesSettings).toContain(Setting.VECTOR_NAME);
        expect(timeSeriesSettings).not.toContain(Setting.INPLACE_RESULT);
        expect(distributionSettings).toContain(Setting.INPLACE_RESULT);
        expect(distributionSettings).not.toContain(Setting.VECTOR_NAME);
    });

    test("assembles a fresh preset before provider data is loaded", () => {
        const manager = makeManager();
        manager
            .getGroupDelegate()
            .appendChild(GroupRegistry.makeGroup(GroupType.PLOT_VIEW, manager, manager.makeGroupColor()));
        const assembler = makePlotVisualizationAssembler({ categoricalPalette: ["#123456"] });

        const product = assembler.make(manager);
        const [plotGroup] = collectPlotGroups(product);

        expect(plotGroup.customProps.colors).toEqual([]);
        expect(plotGroup.customProps.facets).toEqual([{ key: PlotDimension.NONE, row: 0, column: 0, series: [] }]);
        expect(plotGroup.customProps.statisticsTables).toEqual([]);

        manager.beforeDestroy();
    });

    test("publishes only series with one value per unique realization", () => {
        const group = {
            itemType: "group",
            id: "plot-1",
            groupType: GroupType.PLOT_VIEW,
            name: "Plot",
            children: [],
            customProps: {
                visualizationKind: VisualizationKind.HISTOGRAM,
                colorBy: PlotDimension.ENSEMBLE,
                subplotBy: PlotDimension.NONE,
                colors: [{ key: "ensemble-a", color: "#123456" }],
                legendKeys: ["ensemble-a"],
                statisticsTables: [],
                facets: [
                    {
                        key: "none",
                        row: 0,
                        column: 0,
                        series: [
                            {
                                groupKeys: {
                                    [PlotDimension.PROVIDER]: "provider-1",
                                    [PlotDimension.ENSEMBLE]: "ensemble-a",
                                    [PlotDimension.RESULT]: "STOIIP",
                                },
                                role: "primary",
                                points: { x: [1, 2], y: [100, 200] },
                                identity: [{ realization: 1 }, { realization: 2 }],
                            },
                            {
                                groupKeys: {
                                    [PlotDimension.PROVIDER]: "provider-2",
                                    [PlotDimension.ENSEMBLE]: "ensemble-a",
                                    [PlotDimension.VECTOR]: "FOPT",
                                },
                                role: "primary",
                                points: { x: [0, 1], y: [10, 20] },
                                identity: [
                                    { realization: 1, timestampUtcMs: 0 },
                                    { realization: 1, timestampUtcMs: 1 },
                                ],
                            },
                        ],
                    },
                ],
            },
        } as unknown as PlotVisualizationGroup;

        const contents = makePlotChannelContents({ children: [group] });

        expect(contents).toHaveLength(1);
        expect(contents[0].displayName).toContain("STOIIP");
        expect(contents[0].dataGenerator()).toEqual({
            data: [
                { key: 1, value: 100 },
                { key: 2, value: 200 },
            ],
            metaData: {
                ensembleIdentString: "ensemble-a",
                displayString: "STOIIP",
                preferredColor: "#123456",
            },
        });
    });
});

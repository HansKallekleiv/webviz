import { describe, expect, test, vi } from "vitest";

import { DataProviderType } from "@framework/dataProviderFramework/dataProviders/dataProviderTypes";
import { VisualizationKind } from "@framework/dataProviderFramework/dataProviders/visualizationKinds";
import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { Group } from "@framework/dataProviderFramework/framework/Group/Group";
import { GroupRegistry } from "@framework/dataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@framework/dataProviderFramework/groups/groupTypes";
import { Setting } from "@framework/dataProviderFramework/settings/settingsDefinitions";
import { makePlotVisualizationAssembler } from "@framework/dataProviderFramework/visualization/plotAssembler";
import { PlotDimension } from "@framework/dataProviderFramework/visualization/plotTypes";
import {
    ALLOWED_VISUALIZATION_KINDS,
    ChartViewerMode,
    PROVIDER_ACTIONS,
    SETTING_ACTIONS,
} from "@modules/_shared/ChartViewer/config";
import {
    collectPlotGroups,
    makePlotChannelContents,
    type PlotVisualizationGroup,
} from "@modules/_shared/ChartViewer/view/plotChannelContents";

import { makeStubDataProviderManager as makeManager } from "../utils/stubDataProviderManager";

function addPlotView(manager: DataProviderManager): Group<any, any> {
    const plotView = GroupRegistry.makeGroup(GroupType.PLOT_VIEW, manager, manager.makeGroupColor());
    manager.getGroupDelegate().appendChild(plotView);
    return plotView;
}

function getVisualizationKindSetting(plotView: Group<any, any>) {
    return plotView.getSharedSettingsDelegate()!.getWrappedSettings()[Setting.VISUALIZATION_KIND];
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

    test("offers all visualization kinds when the module does not restrict them", async () => {
        const manager = makeManager();
        const setting = getVisualizationKindSetting(addPlotView(manager));

        await vi.waitFor(() => expect(setting.getValueConstraints()).toEqual(Object.values(VisualizationKind)));
        expect(setting.getValue()).toBe(VisualizationKind.TIME_SERIES);
        manager.beforeDestroy();
    });

    test.each([
        [ChartViewerMode.DISTRIBUTION, VisualizationKind.HISTOGRAM],
        [ChartViewerMode.TIME_SERIES, VisualizationKind.TIME_SERIES],
    ])("restricts an empty %s chart to the module's kinds and defaults to the first", async (mode, expected) => {
        const manager = makeManager();
        manager.updateGlobalSetting("allowedVisualizationKinds", ALLOWED_VISUALIZATION_KINDS[mode]);
        const setting = getVisualizationKindSetting(addPlotView(manager));

        await vi.waitFor(() => expect(setting.getValueConstraints()).toEqual(ALLOWED_VISUALIZATION_KINDS[mode]));
        expect(setting.getValue()).toBe(expected);
        manager.beforeDestroy();
    });

    test("applies a restriction set after the chart was created", async () => {
        const manager = makeManager();
        const setting = getVisualizationKindSetting(addPlotView(manager));
        await vi.waitFor(() => expect(setting.getValue()).toBe(VisualizationKind.TIME_SERIES));

        manager.updateGlobalSetting(
            "allowedVisualizationKinds",
            ALLOWED_VISUALIZATION_KINDS[ChartViewerMode.DISTRIBUTION],
        );

        await vi.waitFor(() => expect(setting.getValue()).toBe(VisualizationKind.HISTOGRAM));
        expect(setting.getValueConstraints()).not.toContain(VisualizationKind.TIME_SERIES);
        manager.beforeDestroy();
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

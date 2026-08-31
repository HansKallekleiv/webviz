import { GroupType } from "@framework/dataProviderFramework/groups/groupTypes";
import type { PlotCustomGroupProps } from "@framework/dataProviderFramework/visualization/plotAssembler";
import type { PlotAccumulatedData } from "@framework/dataProviderFramework/visualization/plotCollector";
import { PlotDimension, type SeriesVisualization } from "@framework/dataProviderFramework/visualization/plotTypes";
import type {
    AssemblerProduct,
    VisualizationTarget,
    VisualizationGroup,
} from "@framework/dataProviderFramework/visualization/VisualizationAssembler";
import { VisualizationItemType } from "@framework/dataProviderFramework/visualization/VisualizationAssembler";
import type { ChannelContentDefinition } from "@framework/types/dataChannnel";

export type PlotVisualizationGroup = VisualizationGroup<
    VisualizationTarget.PLOT,
    PlotCustomGroupProps,
    PlotAccumulatedData,
    GroupType.PLOT_VIEW
>;

type PlotTree = Pick<
    AssemblerProduct<VisualizationTarget.PLOT, PlotCustomGroupProps, PlotAccumulatedData>,
    "children"
>;

export function collectPlotGroups(root: PlotTree): PlotVisualizationGroup[] {
    const groups: PlotVisualizationGroup[] = [];
    for (const child of root.children) {
        if (child.itemType !== VisualizationItemType.GROUP) continue;
        if (child.groupType === GroupType.PLOT_VIEW) groups.push(child as PlotVisualizationGroup);
        groups.push(...collectPlotGroups(child));
    }
    return groups;
}

export function makePlotChannelContents(root: PlotTree): ChannelContentDefinition[] {
    return collectPlotGroups(root).flatMap((group) =>
        group.customProps.facets.flatMap((facet) =>
            facet.series.flatMap((series) => makeSeriesChannelContent(group, facet.key, series) ?? []),
        ),
    );
}

function makeSeriesChannelContent(
    group: PlotVisualizationGroup,
    facetKey: string,
    series: SeriesVisualization,
): ChannelContentDefinition | null {
    if (series.role !== "primary" || !series.identity || series.identity.length !== series.points.y.length) return null;

    const realizations = series.identity.map((identity) => identity?.realization);
    if (realizations.some((realization) => realization === undefined)) return null;
    if (new Set(realizations).size !== realizations.length) return null;

    const ensembleIdentString = String(series.groupKeys[PlotDimension.ENSEMBLE] ?? "");
    if (!ensembleIdentString) return null;

    const groupKey = String(series.groupKeys[group.customProps.colorBy] ?? "(none)");
    const preferredColor = group.customProps.colors.find((item) => item.key === groupKey)?.color;
    const seriesName = String(
        series.groupKeys[PlotDimension.RESULT] ??
            series.groupKeys[PlotDimension.VECTOR] ??
            series.groupKeys[PlotDimension.PROVIDER] ??
            group.name,
    );
    const qualifier = Object.entries(series.groupKeys)
        .filter(([key]) => ![PlotDimension.PROVIDER, PlotDimension.RESULT, PlotDimension.VECTOR].includes(key as PlotDimension))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, value]) => value)
        .join(", ");
    const contentIdString = `${group.id}:${facetKey}:${Object.entries(series.groupKeys)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join("|")}`;

    return {
        contentIdString,
        displayName: qualifier ? `${seriesName} (${qualifier})` : seriesName,
        dataGenerator: () => ({
            data: realizations.map((realization, index) => ({
                key: realization as number,
                value: series.points.y[index],
            })),
            metaData: {
                ensembleIdentString,
                displayString: seriesName,
                preferredColor,
            },
        }),
    };
}

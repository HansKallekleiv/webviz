import React from "react";

import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";
import { useAtomValue } from "jotai";

import { colorByAtom, firstResultNameAtom, plotTypeAtom, selectorColumnAtom } from "../atoms/baseAtoms";
import { configurePlotBuilder } from "../utils/configurePlotBuilder";
import type { GroupedTableData } from "../utils/GroupedTableData";
import { makePlotData } from "../utils/makePlotData";
import { PlotBuilder } from "../utils/PlotBuilder";

/**
 * Creates a PlotBuilder instance
 *
 * This hook:
 * - Creates Plotly plot data based on grouped data and current plot setting
 *
 * @param groupedData - GroupedTableData instance with all grouping and color info
 * @param plotOptions - Current plot options from settings
 * @param hoveredRegion - Currently hovered region for highlighting
 * @param hoveredZone - Currently hovered zone for highlighting
 * @param hoveredFacies - Currently hovered facies for highlighting
 * @returns PlotBuilder instance configured with current settings, or null if no data available
 */
export function usePlotBuilder(
    groupedData: GroupedTableData | null,
    plotOptions: any,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
): PlotBuilder | null {
    const firstResultName = useAtomValue(firstResultNameAtom);
    const plotType = useAtomValue(plotTypeAtom);
    const selectorColumn = useAtomValue(selectorColumnAtom);
    const colorBy = useAtomValue(colorByAtom);

    return React.useMemo(() => {
        if (!groupedData || !firstResultName) return null;

        const barSelectorColumn = plotType === PlotType.BAR && selectorColumn ? selectorColumn.toString() : null;

        const builder = new PlotBuilder(
            groupedData,
            makePlotData({
                plotType,
                firstResultName,
                secondResultNameOrSelectorName: barSelectorColumn ?? "",
                histogramBins: plotOptions.histogramBins,
                barSortBy: plotOptions.barSortBy,
                showStatisticalMarkers: plotOptions.showStatisticalMarkers,
                showRealizationPoints: plotOptions.showRealizationPoints,
                showPercentageInBar: plotOptions.showPercentageInHistogram,
            }),
        );

        configurePlotBuilder(builder, {
            plotType,
            firstResultName,
            barSelectorColumn,
            colorBy,
            histogramType: plotOptions.histogramType,
            table: groupedData.getTable(),
        });

        const hoveredItem = hoveredRegion ?? hoveredZone ?? hoveredFacies;
        if (hoveredItem) {
            builder.setHighlightedSubPlots([hoveredItem]);
        }

        return builder;
    }, [
        groupedData,
        firstResultName,
        plotType,
        selectorColumn,
        plotOptions,
        colorBy,
        hoveredRegion,
        hoveredZone,
        hoveredFacies,
    ]);
}

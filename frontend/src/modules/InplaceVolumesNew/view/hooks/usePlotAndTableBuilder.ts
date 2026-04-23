import React from "react";

import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumes/tableUtils";
import { Chart, type ChartZoomState } from "@modules/_shared/eCharts";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";
import { PlotType, type InplaceVolumesPlotOptions } from "@modules/InplaceVolumesNew/typesAndEnums";

import { colorByAtom, resultNameAtom, plotTypeAtom, selectorColumnAtom, subplotByAtom } from "../atoms/baseAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";
import { makeInplaceVolumesPlotTitle } from "../utils/createTitle";
import { GroupedTableData } from "../utils/GroupedTableData";
import { buildInplaceVolumesChartOption } from "../utils/buildEChartOption";
import { buildStatisticsTableData, type StatisticsTableData } from "../utils/TableBuilder";

export function useBuildPlotAndTable(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
    appliedZoomState: ChartZoomState | undefined,
    handleDataZoom: (params: unknown) => void,
): { plots: React.ReactNode; table: Table; statisticsTableData: StatisticsTableData } | null {
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const plotType = useAtomValue(plotTypeAtom);
    const resultName = useAtomValue(resultNameAtom);
    const selectorColumn = useAtomValue(selectorColumnAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);
    const {
        histogramType,
        histogramBins,
        barSortBy,
        showStatisticalMarkers,
        showRealizationPoints,
        sharedXAxis,
        sharedYAxis,
        hideConstants,
        showPercentageInHistogram,
        showStatisticalLabels,
    }: InplaceVolumesPlotOptions = { ...viewContext.useSettingsToViewInterfaceValue("plotOptions") };

    // Return null if there is no data to plot
    if (aggregatedTableDataQueries.tablesData.length === 0 || !resultName) {
        return null;
    }

    // Handle cases where there is a second response
    let barSelectorColumn: string | null = null;
    if (plotType === PlotType.BAR && selectorColumn) {
        barSelectorColumn = selectorColumn.toString();
    }

    const table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

    const title = makeInplaceVolumesPlotTitle(resultName, subplotBy);
    viewContext.setInstanceTitle(title);

    // Create GroupedTableData - shared data structure for plot and table
    const groupedData = new GroupedTableData({
        table,
        subplotBy,
        colorBy,
        ensembleSet,
        colorSet,
    });

    // Filter out grouped entries where all values are constant (zero variance)
    if (hideConstants) {
        groupedData.filterConstantEntries(resultName);
    }

    const hoveredItem = hoveredRegion ?? hoveredZone ?? hoveredFacies;
    const chartOption = buildInplaceVolumesChartOption({
        groupedData,
        plotType,
        resultName,
        selectorColumn: barSelectorColumn,
        colorBy,
        plotOptions: {
            histogramType,
            histogramBins,
            barSortBy,
            showStatisticalMarkers,
            showRealizationPoints,
            sharedXAxis,
            sharedYAxis,
            hideConstants,
            showPercentageInHistogram,
            showStatisticalLabels,
        },
        highlightedSubplotKeys: hoveredItem ? [hoveredItem] : [],
        zoomState: appliedZoomState,
    });

    const plots = React.createElement(Chart, { option: chartOption, onDataZoom: handleDataZoom });

    // Build statistics table data using the same grouped data
    const statisticsTableData = buildStatisticsTableData(groupedData, resultName);

    return { plots, table, statisticsTableData };
}

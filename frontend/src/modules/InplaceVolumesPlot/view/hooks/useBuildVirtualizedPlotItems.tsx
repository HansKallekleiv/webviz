import { useMemo } from "react";

import { useAtomValue } from "jotai";
import type { Shape } from "plotly.js";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { PlotItem } from "@modules/_shared/components/VirtualizedPlotlyFigure";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumes/tableUtils";
import type { Interfaces } from "@modules/InplaceVolumesPlot/interfaces";
import { PlotType, plotTypeToStringMapping } from "@modules/InplaceVolumesPlot/typesAndEnums";

import {
    colorByAtom,
    plotTypeAtom,
    secondResultNameAtom,
    firstResultNameAtom,
    selectorColumnAtom,
    subplotByAtom,
} from "../atoms/baseAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";
import { createLegendPlot, makeAxisOptions, makeFormatLabelFunction, makePlotData } from "../utils/plotComponentUtils";
import { calculateGlobalRanges } from "../utils/plotDataCalculations";
import { createHighlightShape, createPlotItem } from "../utils/plotItemFactory";

export function useBuildVirtualizedPlotItems(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
): PlotItem[] {
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const plotType = useAtomValue(plotTypeAtom);
    const firstResultName = useAtomValue(firstResultNameAtom);
    const secondResultName = useAtomValue(secondResultNameAtom);
    const selectorColumn = useAtomValue(selectorColumnAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);
    const plotOptions = viewContext.useSettingsToViewInterfaceValue("plotOptions");

    const plotItems = useMemo<PlotItem[]>(() => {
        // Return empty array if there is no data to plot
        if (aggregatedTableDataQueries.tablesData.length === 0) {
            return [];
        }

        const table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

        let title = `${plotTypeToStringMapping[plotType]} plot`;
        if (firstResultName) {
            title += ` for ${firstResultName}`;
        }
        viewContext.setInstanceTitle(title);

        let resultNameOrSelectorName: string | null = null;
        if (plotType === PlotType.BAR && selectorColumn) {
            resultNameOrSelectorName = selectorColumn.toString();
        }
        if (plotType !== PlotType.BAR && secondResultName) {
            resultNameOrSelectorName = secondResultName.toString();
        }

        const plotDataFunction = makePlotData(
            plotType,
            firstResultName ?? "",
            resultNameOrSelectorName ?? "",
            colorBy,
            ensembleSet,
            colorSet,
            plotOptions,
        );

        const formatLabelFunction = makeFormatLabelFunction(ensembleSet);

        // Set up axis options based on plot type
        const { xAxisOptions, yAxisOptions } = makeAxisOptions(plotType, firstResultName, resultNameOrSelectorName);

        // If no subplot column, create a single plot item
        if (!subplotBy) {
            const traces = plotDataFunction(table);
            return [
                createPlotItem("main-plot", traces, xAxisOptions, yAxisOptions, plotOptions.histogramType, plotType, {
                    title,
                    showLegend: plotOptions.showLegend,
                    displayModeBar: true,
                }),
            ];
        }

        // Split by subplot column to create individual plots
        const keepColumn = true;
        const tableCollection = table.splitByColumn(subplotBy, keepColumn);
        const tables = tableCollection.getTables();
        const keys = tableCollection.getKeys();

        const highlightedKeys = new Set<string>();
        if (hoveredRegion) highlightedKeys.add(hoveredRegion);
        if (hoveredZone) highlightedKeys.add(hoveredZone);
        if (hoveredFacies) highlightedKeys.add(hoveredFacies);

        const items: PlotItem[] = [];

        // Get legend traces from first subplot for creating a dedicated legend plot
        const firstTable = tables[0];
        const firstTraces = plotDataFunction(firstTable);

        // Calculate global ranges if shared axes are enabled
        let globalXRange: [number, number] | undefined;
        let globalYRange: [number, number] | undefined;

        if (plotOptions.sharedXAxis || plotOptions.sharedYAxis) {
            const allTraces = tables.map((subTable) => plotDataFunction(subTable));
            const { xRange, yRange } = calculateGlobalRanges(allTraces);
            globalXRange = xRange;
            globalYRange = yRange;
        }

        tables.forEach((subTable, index) => {
            const key = keys[index];
            const label = formatLabelFunction(tableCollection.getCollectedBy(), key);
            const traces = plotDataFunction(subTable);

            const isHighlighted = highlightedKeys.has(key.toString());
            const shapes: Partial<Shape>[] = isHighlighted ? [createHighlightShape()] : [];

            // Apply global ranges if shared axes are enabled
            // When shared axis is disabled, don't include the range property at all to allow Plotly auto-scaling
            const xAxisOverrides: Partial<Plotly.LayoutAxis> = {
                tickangle: 35,
                ...(plotOptions.sharedXAxis && globalXRange ? { range: globalXRange } : { autorange: true }),
            };

            const yAxisOverrides: Partial<Plotly.LayoutAxis> = {
                ...(plotOptions.sharedYAxis && globalYRange ? { range: globalYRange } : { autorange: true }),
            };

            items.push(
                createPlotItem(
                    key.toString(),
                    traces,
                    xAxisOptions,
                    yAxisOptions,
                    plotOptions.histogramType,
                    plotType,
                    {
                        title: {
                            text: label,
                            font: { size: 12 },
                        },
                        showLegend: false,
                        displayModeBar: false,
                        shapes: shapes.length > 0 ? shapes : undefined,
                        xAxisOverrides,
                        yAxisOverrides,
                        placeholderLabel: label,
                    },
                ),
            );
        });

        // Add a dedicated legend-only plot at the base of the plot
        items.push(createLegendPlot(firstTraces));

        return items;
    }, [
        aggregatedTableDataQueries.tablesData,
        plotType,
        firstResultName,
        secondResultName,
        selectorColumn,
        subplotBy,
        colorBy,
        ensembleSet,
        colorSet,
        viewContext,
        hoveredRegion,
        hoveredZone,
        hoveredFacies,
        plotOptions,
    ]);

    return plotItems;
}

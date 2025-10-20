import { useMemo } from "react";

import { useAtomValue } from "jotai";
import type { Shape } from "plotly.js";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { PlotItem } from "@modules/_shared/components/VirtualizedPlotlyFigure";
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
import { useInplaceVolumesTable } from "../hooks/useInplaceVolumesTable";
import {
    createLegendPlot,
    makeAxisOptions,
    makeFormatLabelFunction,
    makePlotData,
    createHighlightShape,
} from "../utils/plotComponentUtils";
import { allValuesEqual, calculateGlobalRanges } from "../utils/plotDataCalculations";

export function useBuildVirtualizedPlotItems(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    hoveredRegion: string | null,
    hoveredZone: string | null,
    hoveredFacies: string | null,
): PlotItem[] {
    const inplaceVolumesTable = useInplaceVolumesTable();
    const plotType = useAtomValue(plotTypeAtom);
    const firstResultName = useAtomValue(firstResultNameAtom);
    const secondResultName = useAtomValue(secondResultNameAtom);
    const selectorColumn = useAtomValue(selectorColumnAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);
    const plotOptions = viewContext.useSettingsToViewInterfaceValue("plotOptions");

    const highlightedKeys = useMemo(() => {
        const keys = new Set<string>();
        if (hoveredRegion) keys.add(hoveredRegion);
        if (hoveredZone) keys.add(hoveredZone);
        if (hoveredFacies) keys.add(hoveredFacies);
        return keys;
    }, [hoveredRegion, hoveredZone, hoveredFacies]);

    const plotItems = useMemo<PlotItem[]>(() => {
        if (!inplaceVolumesTable) {
            return [];
        }
        const keyToColor: Map<string, string> = new Map();
        const boxPlotKeyToPositionMap: Map<string, number> = new Map();
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

        const formatLabelFunction = makeFormatLabelFunction(ensembleSet);
        const { xAxisOptions, yAxisOptions } = makeAxisOptions(plotType, firstResultName, resultNameOrSelectorName);

        // No subplots - single plot with color grouping
        if (!subplotBy || subplotBy.length === 0) {
            const plotDataFunction = makePlotData(
                plotType,
                firstResultName ?? "",
                resultNameOrSelectorName ?? "",
                colorBy,
                ensembleSet,
                colorSet,
                plotOptions,
                keyToColor,
                boxPlotKeyToPositionMap,
            );

            const traces = plotDataFunction(inplaceVolumesTable);

            return [
                {
                    id: "main-plot",
                    data: traces,
                    layout: {
                        title,
                        barmode: plotOptions.histogramType,
                        xaxis: xAxisOptions,
                        yaxis: yAxisOptions,
                        showlegend: plotOptions.showLegend,
                        margin: { t: 30, b: 50, l: 50, r: 20 },
                    },
                    config: { displayModeBar: true },
                },
            ];
        }

        const items: PlotItem[] = [];

        // Group by all subplot columns (nested grouping)
        const collection = inplaceVolumesTable.splitByColumns(subplotBy);
        const tables = collection.getTables();
        const keys = collection.getKeys();

        // Calculate global ranges if shared axes are enabled
        // When active all traces are caclulated upfront
        let globalXRange: [number, number] | undefined;
        let globalYRange: [number, number] | undefined;
        let preCalculatedTraces: Map<string, Partial<Plotly.Data>[]> | undefined;

        if (plotOptions.sharedXAxis || plotOptions.sharedYAxis) {
            const plotDataFunction = makePlotData(
                plotType,
                firstResultName ?? "",
                resultNameOrSelectorName ?? "",
                colorBy,
                ensembleSet,
                colorSet,
                plotOptions,
                keyToColor,
                boxPlotKeyToPositionMap,
            );

            const allTraces = tables.map((subTable) => plotDataFunction(subTable));
            const ranges = calculateGlobalRanges(allTraces);
            globalXRange = ranges.xRange;
            globalYRange = ranges.yRange;

            // Store pre-calculated traces to avoid recalculating
            preCalculatedTraces = new Map();
            tables.forEach((subTable, index) => {
                const key = keys[index];
                preCalculatedTraces!.set(key.toString(), allTraces[index]);
            });
        }

        const xAxisOverrides: Partial<Plotly.LayoutAxis> = {
            tickangle: 35,
            ...(plotOptions.sharedXAxis && globalXRange ? { range: globalXRange } : { autorange: true }),
        };

        const yAxisOverrides: Partial<Plotly.LayoutAxis> = {
            ...(plotOptions.sharedYAxis && globalYRange ? { range: globalYRange } : { autorange: true }),
        };

        let firstTraces: Partial<Plotly.Data>[] | null = null;

        tables.forEach((subTable, index) => {
            // Skip this subplot if hideConstantValues is enabled and all values are the same
            if (plotOptions.hideConstants) {
                const resultColumn = subTable.getColumn(firstResultName ?? "");
                if (resultColumn) {
                    const values = resultColumn
                        .getAllRowValues()
                        .filter((v): v is number => typeof v === "number" && !isNaN(v));

                    if (values.length > 0 && allValuesEqual(values)) {
                        return; // Skip this subplot
                    }
                }
            }
            const key = keys[index];
            const keyParts = key.toString().split("|");
            const labelParts = subplotBy.map((colName, idx) => formatLabelFunction(colName, keyParts[idx] || key));
            const label = labelParts.join(" - ");

            const isHighlighted = keyParts.some((part) => highlightedKeys.has(part));
            const shapes: Partial<Shape>[] = isHighlighted ? [createHighlightShape()] : [];
            const plotLayout = {
                title: {
                    text: `${label}`,
                    font: { size: 12 },
                },
                barmode: plotOptions.histogramType,
                xaxis: { ...xAxisOptions, ...xAxisOverrides },
                yaxis: { ...yAxisOptions, ...yAxisOverrides },
                showlegend: false,
                margin: { t: 30, b: 50, l: 50, r: 20 },
                shapes: shapes.length > 0 ? shapes : undefined,
            };

            // Use pre-calculated traces if shared axes enabled, otherwise lazy load
            const plotItem: PlotItem = preCalculatedTraces
                ? {
                      id: key.toString(),
                      data: preCalculatedTraces.get(key.toString()),
                      layout: plotLayout,
                      config: { displayModeBar: false },
                      placeholderLabel: label,
                  }
                : {
                      id: key.toString(),
                      getData: () => {
                          const plotDataFunction = makePlotData(
                              plotType,
                              firstResultName ?? "",
                              resultNameOrSelectorName ?? "",
                              colorBy,
                              ensembleSet,
                              colorSet,
                              plotOptions,
                              new Map(),
                              new Map(),
                          );
                          return plotDataFunction(subTable);
                      },
                      layout: plotLayout,
                      config: { displayModeBar: false },
                      placeholderLabel: label,
                  };

            items.push(plotItem);

            // Get first traces for legend (only calculate once)
            if (firstTraces === null) {
                if (preCalculatedTraces) {
                    firstTraces = preCalculatedTraces.get(key.toString()) || null;
                } else {
                    const plotDataFunction = makePlotData(
                        plotType,
                        firstResultName ?? "",
                        resultNameOrSelectorName ?? "",
                        colorBy,
                        ensembleSet,
                        colorSet,
                        plotOptions,
                        keyToColor,
                        boxPlotKeyToPositionMap,
                    );
                    firstTraces = plotDataFunction(subTable);
                }
            }
        });

        // Add legend plot
        if (firstTraces) {
            items.push(createLegendPlot(firstTraces));
        }

        return items;
    }, [
        inplaceVolumesTable,
        plotType,
        firstResultName,
        secondResultName,
        selectorColumn,
        subplotBy,
        colorBy,
        ensembleSet,
        colorSet,
        viewContext,
        highlightedKeys,
        plotOptions,
    ]);

    return plotItems;
}

import { useMemo, useRef, useEffect } from "react";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { TableColumns } from "@lib/components/Table/types";
import { computeReservesP10, computeReservesP90 } from "@modules/_shared/utils/math/statistics";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import type { Interfaces } from "@modules/InplaceVolumesPlot/interfaces";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";
import { useAtomValue } from "jotai";

import { colorByAtom, firstResultNameAtom, subplotByAtom } from "../atoms/baseAtoms";

import { useInplaceVolumesTable } from "./useInplaceVolumesTable";

type StatisticalRowData = {
    [key: string]: string | number;
};

const STAT_COLUMNS = ["mean", "min", "max", "p10", "p90", "stddev"] as const;

/**
 * Hook to build statistical table data with lazy calculation
 * Only computes statistics for rows when they're accessed
 *
 */
export function useBuildStatisticalTable(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
): {
    columns: TableColumns<StatisticalRowData>;
    rows: StatisticalRowData[];
} {
    const inplaceVolumesTable = useInplaceVolumesTable();
    const firstResultName = useAtomValue(firstResultNameAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);
    const plotOptions = viewContext.useSettingsToViewInterfaceValue("plotOptions");
    const plotType = viewContext.useSettingsToViewInterfaceValue("plotType");
    const ensembleIdentStringToNameMap = new Map(
        ensembleSet.getEnsembleArray().map((ens) => [ens.getIdent().toString(), ens.getDisplayName()]),
    );
    // Cache for computed statistics - persists across renders
    const statsCache = useRef<Map<string, StatisticalRowData>>(new Map());

    // Clear cache when dependencies change
    useEffect(() => {
        statsCache.current.clear();
    }, [firstResultName, subplotBy, colorBy]);

    const { columns, rows } = useMemo<{
        columns: TableColumns<StatisticalRowData>;
        rows: StatisticalRowData[];
    }>(() => {
        // Return empty if no data
        if (plotType !== PlotType.STATISTICAL_TABLE || !inplaceVolumesTable || !firstResultName) {
            return { columns: [], rows: [] };
        }

        // Get required columns
        const resultColumn = inplaceVolumesTable.getColumn(firstResultName);
        if (!resultColumn) {
            return { columns: [], rows: [] };
        }

        // Determine grouping columns (subplot + color)

        const groupingColumns = Array.from(new Set([...subplotBy, colorBy]));

        if (groupingColumns.length === 0) {
            return { columns: [], rows: [] };
        }

        // Build table columns configuration
        const tableColumns: TableColumns<StatisticalRowData> = [];

        // Add grouping columns
        for (const colName of groupingColumns) {
            tableColumns.push({
                _type: "data",
                columnId: colName,
                label: colName,
                sizeInPercent: Math.floor(40 / groupingColumns.length),
            });
        }

        // Add statistical columns
        const statColumns = [
            { id: "mean", label: "Mean" },
            { id: "min", label: "Min" },
            { id: "max", label: "Max" },
            { id: "p10", label: "P10" },
            { id: "p90", label: "P90" },
            { id: "stddev", label: "Std Dev" },
        ];

        const statColumnWidth = Math.floor(60 / statColumns.length);
        for (const stat of statColumns) {
            tableColumns.push({
                _type: "data",
                columnId: stat.id,
                label: stat.label,
                sizeInPercent: statColumnWidth,
                formatValue: (value: number | string) => {
                    if (typeof value === "number") {
                        return formatNumber(value, 2);
                    }
                    return String(value);
                },
            });
        }

        // Group data
        const collection = inplaceVolumesTable.splitByColumns(groupingColumns);
        const tables = collection.getTables();
        const keys = collection.getKeys();

        // Create proxy rows that calculate statistics lazily
        const rowsData: StatisticalRowData[] = tables.map((groupTable, index) => {
            const key = keys[index];
            const keyStr = key.toString();
            const keyParts = keyStr.split("|");

            return createLazyStatisticalRow(
                keyStr,
                keyParts,
                groupTable,
                groupingColumns,
                firstResultName,
                statsCache.current,
                ensembleIdentStringToNameMap,
            );
        });

        // Filter out constant value rows if option is enabled
        const filteredRows = plotOptions.hideConstants
            ? rowsData.filter((row) => {
                  // Access stddev to check if constant
                  const stddev = row.stddev;
                  // If standard deviation is effectively zero, all values are constant
                  return typeof stddev !== "number" || stddev > 1e-10;
              })
            : rowsData;

        return { columns: tableColumns, rows: filteredRows };
    }, [inplaceVolumesTable, firstResultName, subplotBy, colorBy, plotOptions.hideConstants, plotType]);

    return { columns, rows };
}

/**
 * Creates a lazy proxy row that calculates statistics only when accessed
 */
function createLazyStatisticalRow(
    cacheKey: string,
    keyParts: string[],
    groupTable: any,
    groupingColumns: string[],
    resultName: string,
    cache: Map<string, StatisticalRowData>,
    ensembleIdentStringToNameMap: Map<string, string>,
): StatisticalRowData {
    return new Proxy({} as StatisticalRowData, {
        get(target, prop: string) {
            // Check cache first
            const cached = cache.get(cacheKey);
            if (cached && prop in cached) {
                return cached[prop];
            }

            // Grouping columns don't require calculation
            const groupingIndex = groupingColumns.indexOf(prop);
            if (groupingIndex !== -1) {
                return keyParts[groupingIndex];
            }

            // Calculate and cache statistics on first stat column access
            if (!cache.has(cacheKey)) {
                const stats = calculateStatisticsForGroup(groupTable, resultName);
                const rowData = buildCompleteRowData(stats, groupingColumns, keyParts, ensembleIdentStringToNameMap);
                cache.set(cacheKey, rowData);
            }

            return cache.get(cacheKey)![prop];
        },

        ownKeys() {
            return [...groupingColumns, ...STAT_COLUMNS];
        },

        getOwnPropertyDescriptor() {
            return { enumerable: true, configurable: true };
        },

        has(target, prop) {
            return [...groupingColumns, ...STAT_COLUMNS].includes(prop as string);
        },
    });
}

/**
 * Calculate statistics for a grouped table
 */
function calculateStatisticsForGroup(
    groupTable: any,
    resultName: string,
): { mean: number; min: number; max: number; p10: number; p90: number; stddev: number } | null {
    const resultColumn = groupTable.getColumn(resultName);
    if (!resultColumn) return null;

    const values = resultColumn.getAllRowValues().filter((v: any): v is number => typeof v === "number" && !isNaN(v));

    if (values.length === 0) return null;

    return calculateStatistics(values);
}

/**
 * Build complete row data with grouping values and statistics
 */
function buildCompleteRowData(
    stats: ReturnType<typeof calculateStatistics> | null,
    groupingColumns: string[],
    keyParts: string[],
    ensembleIdentStringToNameMap: Map<string, string>,
): StatisticalRowData {
    const rowData: StatisticalRowData = stats ? { ...stats } : {};

    groupingColumns.forEach((colName, idx) => {
        if (colName === "ENSEMBLE") {
            rowData[colName] = ensembleIdentStringToNameMap.get(keyParts[idx]) ?? keyParts[idx];
        } else {
            rowData[colName] = keyParts[idx];
        }
    });

    return rowData;
}

/**
 * Calculate statistics -- move these to stats utils??
 */
function calculateStatistics(values: number[]): {
    mean: number;
    min: number;
    max: number;
    p10: number;
    p90: number;
    stddev: number;
} {
    const n = values.length;
    if (n === 0) {
        // Handle empty array case
        return { mean: NaN, min: Infinity, max: -Infinity, p10: NaN, p90: NaN, stddev: NaN };
    }

    const sorted = [...values].sort((a, b) => a - b);

    // Mean
    const mean = sorted.reduce((sum, val) => sum + val, 0) / n;

    // Min and Max
    const min = sorted[0];
    const max = sorted[n - 1];

    // Percentiles
    const p10 = computeReservesP10(sorted);
    const p90 = computeReservesP90(sorted);

    // Standard deviation (sample)
    const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stddev = Math.sqrt(variance);

    return { mean, min, max, p10, p90, stddev };
}

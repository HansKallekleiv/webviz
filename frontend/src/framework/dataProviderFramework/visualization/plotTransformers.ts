import { StatisticFunction_api } from "@api";
import { SummaryVectorRepresentation } from "@framework/domain/DataAddress";
import { getColumnValue, type RealizationTable } from "@framework/domain/RealizationTable";

import type {
    InplaceVolumesSettings,
    InplaceVolumesStoredData,
} from "../dataProviders/implementations/InplaceVolumesProvider";
import type {
    SummaryVectorHistoryData,
    SummaryVectorHistorySettings,
    SummaryVectorObservationData,
    SummaryVectorObservationSettings,
} from "../dataProviders/implementations/SummaryVectorAuxiliaryProviders";
import type { SummaryVectorData, SummaryVectorSettings } from "../dataProviders/implementations/SummaryVectorProvider";

import type { SeriesPointIdentity, SeriesRole, SeriesVisualization } from "./plotTypes";
import type { TransformerArgs } from "./VisualizationAssembler";

export const PlotSeriesGroupKey = {
    ENSEMBLE: "ensemble",
    PROVIDER: "provider",
    REALIZATION: "realization",
    RESULT: "result",
    STATISTIC: "statistic",
    VECTOR: "vector",
} as const;

export function transformSummaryVectorToPlot(
    args: TransformerArgs<SummaryVectorSettings, SummaryVectorData>,
): SeriesVisualization[] {
    const data = args.getData();
    return data ? makeSummaryVectorSeries(data, args.id) : [];
}

export function transformSummaryVectorHistoryToPlot(
    args: TransformerArgs<SummaryVectorHistorySettings, SummaryVectorHistoryData>,
): SeriesVisualization[] {
    const data = args.getData();
    return data ? makeSummaryVectorHistorySeries(data, args.id) : [];
}

export function transformSummaryVectorObservationToPlot(
    args: TransformerArgs<SummaryVectorObservationSettings, SummaryVectorObservationData>,
): SeriesVisualization[] {
    const data = args.getData();
    return data ? makeSummaryVectorObservationSeries(data, args.id) : [];
}

export function transformInplaceVolumesToPlot(
    args: TransformerArgs<InplaceVolumesSettings, RealizationTable, InplaceVolumesStoredData>,
): SeriesVisualization[] {
    const data = args.getData();
    return data ? makeInplaceVolumesSeries(data, args.id) : [];
}

export function makeSummaryVectorSeries(data: SummaryVectorData, providerId: string): SeriesVisualization[] {
    const commonKeys = {
        [PlotSeriesGroupKey.PROVIDER]: providerId,
        [PlotSeriesGroupKey.ENSEMBLE]: data.address.ensemble.toString(),
        [PlotSeriesGroupKey.VECTOR]: data.address.vectorName,
    };

    if (data.realizations) {
        return data.realizations.map((item) => ({
            groupKeys: { ...commonKeys, [PlotSeriesGroupKey.REALIZATION]: item.realization },
            role: "primary",
            points: { x: item.timestampsUtcMs, y: item.values },
            identity: makeTimestampIdentity(item.timestampsUtcMs, item.realization),
        }));
    }

    return data.statistics.valueObjects.map((item) => ({
        groupKeys: { ...commonKeys, [PlotSeriesGroupKey.STATISTIC]: item.statisticFunction },
        role: makeStatisticRole(data.address.representation, item.statisticFunction),
        points: { x: data.statistics.timestampsUtcMs, y: item.values },
        identity: makeTimestampIdentity(data.statistics.timestampsUtcMs),
    }));
}

export function makeSummaryVectorHistorySeries(
    data: SummaryVectorHistoryData,
    providerId: string,
): SeriesVisualization[] {
    return [
        {
            groupKeys: {
                [PlotSeriesGroupKey.PROVIDER]: providerId,
                [PlotSeriesGroupKey.ENSEMBLE]: data.ensemble.toString(),
                [PlotSeriesGroupKey.VECTOR]: data.vectorName,
            },
            role: "history",
            points: { x: data.history.timestampsUtcMs, y: data.history.values },
            identity: makeTimestampIdentity(data.history.timestampsUtcMs),
        },
    ];
}

export function makeSummaryVectorObservationSeries(
    data: SummaryVectorObservationData,
    providerId: string,
): SeriesVisualization[] {
    const timestamps = data.observations.map((item) => item.timestamp_utc_ms);
    return [
        {
            groupKeys: {
                [PlotSeriesGroupKey.PROVIDER]: providerId,
                [PlotSeriesGroupKey.ENSEMBLE]: data.ensemble.toString(),
                [PlotSeriesGroupKey.VECTOR]: data.vectorName,
            },
            role: "observation",
            points: { x: timestamps, y: data.observations.map((item) => item.value) },
            identity: makeTimestampIdentity(timestamps),
        },
    ];
}

export function makeInplaceVolumesSeries(table: RealizationTable, providerId: string): SeriesVisualization[] {
    const indexColumnNames = Object.keys(table.indexColumns).sort();
    const groupedRows = new Map<string, { groupKeys: Record<string, string | number>; rowIndices: number[] }>();

    for (let rowIndex = 0; rowIndex < table.keyColumns.realization.length; rowIndex++) {
        const groupKeys: Record<string, string | number> = {
            [PlotSeriesGroupKey.PROVIDER]: providerId,
            [PlotSeriesGroupKey.ENSEMBLE]: table.origin.ensemble.toString(),
        };
        const keyValues = indexColumnNames.map((columnName) => {
            const value = getColumnValue(table.indexColumns[columnName], rowIndex);
            if (value !== null) groupKeys[columnName] = value;
            return value;
        });
        const groupingKey = JSON.stringify(keyValues);
        const group = groupedRows.get(groupingKey) ?? { groupKeys, rowIndices: [] };
        group.rowIndices.push(rowIndex);
        groupedRows.set(groupingKey, group);
    }

    return Array.from(groupedRows.values()).flatMap(({ groupKeys, rowIndices }) =>
        table.valueColumns.map((valueColumn) => ({
            groupKeys: { ...groupKeys, [PlotSeriesGroupKey.RESULT]: valueColumn.name },
            role: "primary" as const,
            points: {
                x: rowIndices.map((rowIndex) => table.keyColumns.realization[rowIndex]),
                y: rowIndices.map((rowIndex) => valueColumn.values[rowIndex]),
            },
            identity: rowIndices.map((rowIndex) => makeTableRowIdentity(table, rowIndex, indexColumnNames)),
        })),
    );
}

function makeTimestampIdentity(timestamps: ArrayLike<number>, realization?: number): SeriesPointIdentity[] {
    return Array.from(timestamps, (timestampUtcMs) => ({ timestampUtcMs, realization }));
}

function makeStatisticRole(
    representation: SummaryVectorRepresentation,
    statisticFunction: StatisticFunction_api,
): SeriesRole {
    if (representation !== SummaryVectorRepresentation.FANCHART) return "statistics-line";
    return statisticFunction === StatisticFunction_api.MEAN || statisticFunction === StatisticFunction_api.P50
        ? "statistics-line"
        : "statistics-band";
}

function makeTableRowIdentity(
    table: RealizationTable,
    rowIndex: number,
    indexColumnNames: readonly string[],
): SeriesPointIdentity {
    return {
        realization: table.keyColumns.realization[rowIndex],
        timestampUtcMs: table.keyColumns.timestamp?.[rowIndex],
        indexValues: Object.fromEntries(
            indexColumnNames.map((columnName) => [columnName, getColumnValue(table.indexColumns[columnName], rowIndex)]),
        ),
    };
}
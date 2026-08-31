import { getColumnValue, type IndexColumnValue, type RealizationTable } from "./RealizationTable";

export type Statistics = {
    count: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    p10: number;
    p90: number;
};

export type GroupedStatistics = {
    group: Readonly<Record<string, IndexColumnValue>>;
    valueStatistics: Readonly<Record<string, Statistics>>;
};

export function computeStatistics(values: readonly number[]): Statistics {
    if (values.length === 0) {
        return { count: 0, mean: 0, stdDev: 0, min: 0, max: 0, p10: 0, p90: 0 };
    }

    const count = values.length;
    const mean = values.reduce((sum, value) => sum + value, 0) / count;
    const variance = count > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1) : 0;

    return {
        count,
        mean,
        stdDev: Math.sqrt(variance),
        min: Math.min(...values),
        max: Math.max(...values),
        p10: computeQuantile(values, 0.9),
        p90: computeQuantile(values, 0.1),
    };
}

function computeQuantile(values: readonly number[], quantile: number): number {
    const sortedValues = [...values].sort((first, second) => first - second);
    const rank = (sortedValues.length - 1) * quantile;
    const lowerRank = Math.floor(rank);
    const fraction = rank - lowerRank;
    return sortedValues[lowerRank] * (1 - fraction) + sortedValues[Math.ceil(rank)] * fraction;
}

export function computeGroupedStatistics(table: RealizationTable, groupByColumns: readonly string[]): GroupedStatistics[] {
    const columns = groupByColumns.map((columnName) => {
        const column = table.indexColumns[columnName];
        if (!column) {
            throw new Error(`Index column ${columnName} not found`);
        }
        return column;
    });
    const groups = new Map<string, { group: Record<string, IndexColumnValue>; rowIndices: number[] }>();

    for (let rowIndex = 0; rowIndex < table.keyColumns.realization.length; rowIndex++) {
        const group = Object.fromEntries(
            groupByColumns.map((columnName, columnIndex) => [columnName, getColumnValue(columns[columnIndex], rowIndex)]),
        );
        const key = JSON.stringify(groupByColumns.map((columnName) => group[columnName]));
        const entry = groups.get(key) ?? { group, rowIndices: [] };
        entry.rowIndices.push(rowIndex);
        groups.set(key, entry);
    }

    return Array.from(groups.values(), ({ group, rowIndices }) => ({
        group,
        valueStatistics: Object.fromEntries(
            table.valueColumns.map((column) => [
                column.name,
                computeStatistics(rowIndices.map((rowIndex) => column.values[rowIndex])),
            ]),
        ),
    }));
}
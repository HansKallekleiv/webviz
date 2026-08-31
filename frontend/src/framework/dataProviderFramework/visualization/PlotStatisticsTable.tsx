import React from "react";

import { orderBy } from "lodash-es";

import { Table } from "@lib/components/Table";
import { TableCompositions } from "@lib/components/Table/compositions";
import type { TableSortState } from "@lib/components/Table/typesAndEnums";

import type { PlotGroupProduct } from "./plotCollector";

type StatisticsRow = {
    id: string;
    group: string;
    result: string;
    mean: number;
    p10: number;
    p90: number;
    stdDev: number;
    min: number;
    max: number;
};

const COLUMNS: readonly { key: keyof StatisticsRow; label: string; width: number }[] = [
    { key: "group", label: "Group", width: 24 },
    { key: "result", label: "Result", width: 16 },
    { key: "mean", label: "Mean", width: 10 },
    { key: "p10", label: "P10", width: 10 },
    { key: "p90", label: "P90", width: 10 },
    { key: "stdDev", label: "Std Dev", width: 10 },
    { key: "min", label: "Min", width: 10 },
    { key: "max", label: "Max", width: 10 },
];

export function makePlotStatisticsRows(product: PlotGroupProduct): StatisticsRow[] {
    return product.statisticsTables.flatMap(({ groups }, tableIndex) =>
        groups.flatMap((group, groupIndex) =>
            Object.entries(group.valueStatistics).map(([result, statistics]) => ({
                id: `${tableIndex}-${groupIndex}-${result}`,
                group: Object.entries(group.group)
                    .map(([name, value]) => `${name}: ${value ?? "(none)"}`)
                    .join(", "),
                result,
                mean: statistics.mean,
                p10: statistics.p10,
                p90: statistics.p90,
                stdDev: statistics.stdDev,
                min: statistics.min,
                max: statistics.max,
            })),
        ),
    );
}

export function PlotStatisticsTable(props: { product: PlotGroupProduct }): React.ReactNode {
    const [sorting, setSorting] = React.useState<TableSortState[]>([]);
    const rows = orderBy(
        makePlotStatisticsRows(props.product),
        sorting.map((item) => item.columnKey),
        sorting.map((item) => item.direction as "asc" | "desc"),
    );

    return (
        <div className="h-full min-h-0 overflow-auto">
            <Table.Root
                fixed
                compact
                size="small"
                height="100%"
                sortable="multiple"
                columnSorting={sorting}
                onChangeColumnSort={setSorting}
            >
                <Table.Head sticky>
                    {COLUMNS.map((column) => (
                        <Table.Column key={column.key} colKey={column.key} widthInPercent={column.width}>
                            {column.label}
                        </Table.Column>
                    ))}
                </Table.Head>
                <Table.Body>
                    <TableCompositions.VirtualizedRows rows={rows}>
                        {(row) => (
                            <Table.Row key={row.id}>
                                {COLUMNS.map((column) => (
                                    <Table.Cell key={column.key}>{formatCell(row[column.key])}</Table.Cell>
                                ))}
                            </Table.Row>
                        )}
                    </TableCompositions.VirtualizedRows>
                </Table.Body>
            </Table.Root>
        </div>
    );
}

function formatCell(value: string | number): string {
    return typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;
}
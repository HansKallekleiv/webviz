import type { TableColumns } from "@lib/components/Table/types";
import { formatValueWithAdaptivePrecision } from "@modules/_shared/utils/numberFormatting";

import type { GroupedTableData } from "./GroupedTableData";
import { computeStatistics } from "./statistics";

export type StatisticsTableRowData = {
    id: string;
    subplotValue: string;
    colorByValue: string;
    colorByKey: string;
    mean: number | null;
    stdDev: number | null;
    min: number | null;
    max: number | null;
    p10: number | null;
    p50: number | null;
    p90: number | null;
};

const BASE_STATISTICS_TABLE_COLUMNS: TableColumns<StatisticsTableRowData> = [
    {
        _type: "data",
        columnId: "subplotValue",
        label: "Subplot",
        sizeInPercent: 15,
    },
    {
        _type: "data",
        columnId: "colorByValue",
        label: "Color",
        sizeInPercent: 15,
    },
    {
        _type: "data",
        columnId: "mean",
        label: "Mean",
        sizeInPercent: 10,
        formatValue: formatValueWithAdaptivePrecision,
    },
    {
        _type: "data",
        columnId: "p10",
        label: "P10",
        sizeInPercent: 10,
        formatValue: formatValueWithAdaptivePrecision,
    },
    {
        _type: "data",
        columnId: "p90",
        label: "P90",
        sizeInPercent: 10,
        formatValue: formatValueWithAdaptivePrecision,
    },
    {
        _type: "data",
        columnId: "p50",
        label: "P50",
        sizeInPercent: 10,
        formatValue: formatValueWithAdaptivePrecision,
    },
    {
        _type: "data",
        columnId: "stdDev",
        label: "Std Dev",
        sizeInPercent: 10,
        formatValue: formatValueWithAdaptivePrecision,
    },
    {
        _type: "data",
        columnId: "min",
        label: "Min",
        sizeInPercent: 10,
        formatValue: formatValueWithAdaptivePrecision,
    },
    {
        _type: "data",
        columnId: "max",
        label: "Max",
        sizeInPercent: 10,
        formatValue: formatValueWithAdaptivePrecision,
    },
];

export class TableBuilder {
    private _rows: StatisticsTableRowData[];
    private _colorMap: Map<string, string>;
    private _subplotByLabel: string;
    private _colorByLabel: string;

    constructor(groupedData: GroupedTableData, resultName: string) {
        this._rows = [];
        this._colorMap = groupedData.getColorMap();
        this._subplotByLabel = groupedData.getSubplotBy();
        this._colorByLabel = groupedData.getColorBy();

        for (const entry of groupedData.getAllEntries()) {
            const resultColumn = entry.table.getColumn(resultName);
            if (!resultColumn) {
                continue;
            }

            const values = resultColumn.getAllRowValues() as number[];
            const stats = computeStatistics(values);

            this._rows.push({
                id: `${entry.subplotKey}-${entry.colorKey}`,
                subplotValue: entry.subplotLabel,
                colorByValue: entry.colorLabel,
                colorByKey: entry.colorKey,
                mean: stats.mean,
                stdDev: stats.stdDev,
                min: stats.min,
                max: stats.max,
                p10: stats.p10,
                p50: stats.p50,
                p90: stats.p90,
            });
        }
    }

    getRows(): StatisticsTableRowData[] {
        return this._rows;
    }

    buildColumns(): TableColumns<StatisticsTableRowData> {
        return BASE_STATISTICS_TABLE_COLUMNS.map(
            (col: TableColumns<StatisticsTableRowData>[number]): TableColumns<StatisticsTableRowData>[number] => {
                if (col._type === "data" && col.columnId === "subplotValue") {
                    return {
                        ...col,
                        label: this._subplotByLabel,
                    };
                }
                if (col._type === "data" && col.columnId === "colorByValue") {
                    return {
                        ...col,
                        label: this._colorByLabel,
                        renderData: (value: string, context: { entry: StatisticsTableRowData }) => {
                            const rowColor = this._colorMap.get(context.entry.colorByKey);
                            return (
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: rowColor }}
                                    />
                                    <span>{value}</span>
                                </div>
                            );
                        },
                    };
                }
                return col;
            },
        );
    }
}

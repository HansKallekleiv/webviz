import { FluidZone_api, InplaceVolumetricStatistic_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { TableHeading, TableRow } from "@lib/components/Table/table";
import { Column, ColumnType, Row, Table } from "@modules/_shared/InplaceVolumetrics/Table";
import {
    makeStatisticalTableColumnDataFromApiData,
    makeTableFromApiData,
} from "@modules/_shared/InplaceVolumetrics/tableUtils";
import {
    InplaceVolumetricsStatisticalTableData,
    InplaceVolumetricsTableData,
} from "@modules/_shared/InplaceVolumetrics/types";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

export function createTableHeadingsAndRowsFromTablesData(
    tablesData: InplaceVolumetricsTableData[],
    ensembleSet: EnsembleSet
): {
    headings: TableHeading;
    rows: TableRow<any>[];
} {
    const tableHeadings: TableHeading = {};
    const tableRows: TableRow<any>[] = [];

    const dataTable = makeTableFromApiData(tablesData);
    for (const column of dataTable.getColumns()) {
        tableHeadings[column.getName()] = {
            label: column.getName(),
            sizeInPercent: 100 / dataTable.getNumColumns(),
            formatValue: makeValueFormattingFunc(column, ensembleSet),
            formatStyle: makeStyleFormattingFunc(column),
        };
    }

    for (const row of dataTable.getRows()) {
        tableRows.push(row);
    }

    return { headings: tableHeadings, rows: tableRows };
}

export function createStatisticalTableHeadingsAndRowsFromTablesData(
    tablesData: InplaceVolumetricsStatisticalTableData[],
    statisticOptions: InplaceVolumetricStatistic_api[],
    ensembleSet: EnsembleSet
): {
    headings: TableHeading;
    rows: TableRow<any>[];
} {
    const tableHeadings: TableHeading = {};
    const tableRows: TableRow<any>[] = [];

    const columnData = makeStatisticalTableColumnDataFromApiData(tablesData, statisticOptions);

    const nonStatisticalColumns = columnData.nonStatisticalColumns;
    const resultStatisticalColumns = columnData.resultStatisticalColumns;

    let numStatisticalColumns = 0;
    for (const elm of resultStatisticalColumns.values()) {
        numStatisticalColumns += Object.keys(elm).length;
    }
    const totalNumberOfColumns = nonStatisticalColumns.length + numStatisticalColumns;

    // Headings for non-statistical columns
    for (const column of nonStatisticalColumns) {
        tableHeadings[column.getName()] = {
            label: column.getName(),
            sizeInPercent: 100 / totalNumberOfColumns,
            formatValue: makeValueFormattingFunc(column, ensembleSet),
            formatStyle: makeStyleFormattingFunc(column),
        };
    }

    // Initialize rows using non-statistical columns
    const rows: Row[] = [];
    const nonStatisticalColumnsTable = new Table(nonStatisticalColumns);
    for (const row of nonStatisticalColumnsTable.getRows()) {
        rows.push(row);
    }

    const numberOfRows = rows.length;

    // Headings and row data for result statistical columns
    const sortedResultNames = Array.from(resultStatisticalColumns.keys()).sort();
    for (const resultName of sortedResultNames) {
        const statisticalColumns = resultStatisticalColumns.get(resultName);
        if (!statisticalColumns) {
            throw new Error(`Statistical columns for result ${resultName} not found.`);
        }

        // Create table object for easier access to columns and rows
        const resultStatisticalTable = new Table(Object.values(statisticalColumns));

        const subHeading: TableHeading = {};
        resultStatisticalTable.getColumns().forEach((column) => {
            const columnId = `${resultName}-${column.getName()}`;
            subHeading[columnId] = {
                label: column.getName(),
                sizeInPercent: 100 / totalNumberOfColumns,
                formatValue: makeValueFormattingFunc(column, ensembleSet),
                formatStyle: makeStyleFormattingFunc(column),
            };
        });

        tableHeadings[resultName] = {
            label: resultName,
            sizeInPercent: 100 / totalNumberOfColumns,
            subHeading: subHeading,
        };

        if (numberOfRows !== resultStatisticalTable.getNumRows()) {
            throw new Error(
                "Number of rows in statistical table does not match the number of rows in the non-statistical table."
            );
        }

        for (let i = 0; i < numberOfRows; i++) {
            const statisticalRow = resultStatisticalTable.getRow(i);

            // Add resultName as prefix to column names
            for (const column of resultStatisticalTable.getColumns()) {
                const columnId = `${resultName}-${column.getName()}`;
                rows[i][columnId] = statisticalRow[column.getName()];
            }
        }
    }

    // Add rows to tableRows
    for (const row of rows) {
        tableRows.push(row);
    }

    return { headings: tableHeadings, rows: tableRows };
}

function makeStyleFormattingFunc(column: Column): ((value: number | string | null) => React.CSSProperties) | undefined {
    if (column.getType() === ColumnType.FLUID_ZONE) {
        return (value: number | string | null) => {
            const style: React.CSSProperties = { textAlign: "right", fontWeight: "bold" };

            if (value === FluidZone_api.OIL) {
                style.color = "#0b8511";
            }
            if (value === FluidZone_api.WATER) {
                style.color = "#0c24ab";
            }
            if (value === FluidZone_api.GAS) {
                style.color = "#ab110c";
            }

            return style;
        };
    }

    if (column.getType() === ColumnType.ENSEMBLE) {
        return undefined;
    }

    return () => ({ textAlign: "right" });
}

function makeValueFormattingFunc(
    column: Column,
    ensembleSet: EnsembleSet
): ((value: number | string | null) => string) | undefined {
    if (column.getType() === ColumnType.ENSEMBLE) {
        return (value: number | string | null) => formatEnsembleIdent(value, ensembleSet);
    }
    if (column.getType() === ColumnType.RESULT) {
        return formatResultValue;
    }

    return undefined;
}

function formatEnsembleIdent(value: string | number | null, ensembleSet: EnsembleSet): string {
    if (value === null) {
        return "-";
    }
    const ensemble = ensembleSet.findEnsembleByIdentString(value.toString());
    if (ensemble) {
        return makeDistinguishableEnsembleDisplayName(
            EnsembleIdent.fromString(value.toString()),
            ensembleSet.getEnsembleArr()
        );
    }
    return value.toString();
}

function formatResultValue(value: string | number | null): string {
    // If properties cannot be calculated,
    // e.g. due to a 0 denominator, the value returned from backend will be null
    if (value === null) {
        return "-";
    }

    if (typeof value === "string") {
        return value;
    }

    let suffix = "";
    const log = Math.log10(Math.abs(value));
    if (log >= 6) {
        value /= 1e6;
        suffix = "M";
    } else if (log >= 3) {
        value /= 1e3;
        suffix = "k";
    }

    return `${value.toFixed(2)} ${suffix}`;
}

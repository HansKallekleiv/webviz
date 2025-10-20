import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InplaceVolumesTableData } from "@modules/_shared/InplaceVolumes/types";

/**
 * InplaceVolumes table implementation for efficient data manipulation
 */
export class InplaceVolumesTable {
    private columns: Map<string, Array<string | number | RegularEnsembleIdent | null>>;
    private rowCount: number;

    private constructor(columns: Map<string, Array<string | number | RegularEnsembleIdent | null>>, rowCount: number) {
        this.columns = columns;
        this.rowCount = rowCount;
    }

    /**
     * Create a InplaceVolumesTable from API data
     */
    static fromApiData(data: InplaceVolumesTableData[]): InplaceVolumesTable {
        const columns = new Map<string, Array<string | number | RegularEnsembleIdent | null>>();

        // Initialize columns with keys matching TableOriginKey
        columns.set("ENSEMBLE", []);
        columns.set("TABLE_NAME", []);
        columns.set("FLUID", []);

        let rowCount = 0;

        for (const tableSet of data) {
            for (const perFluidTable of tableSet.data.tableDataPerFluidSelection) {
                // Process selector columns
                for (const selectorColumn of perFluidTable.selectorColumns) {
                    if (!columns.has(selectorColumn.columnName)) {
                        columns.set(selectorColumn.columnName, []);
                    }
                }

                // Process result columns
                for (const resultColumn of perFluidTable.resultColumns) {
                    if (!columns.has(resultColumn.columnName)) {
                        columns.set(resultColumn.columnName, []);
                    }
                }

                // Add rows
                const numRows =
                    perFluidTable.selectorColumns[0]?.indices.length ||
                    perFluidTable.resultColumns[0]?.columnValues.length ||
                    0;

                for (let i = 0; i < numRows; i++) {
                    // Add selector values
                    for (const selectorColumn of perFluidTable.selectorColumns) {
                        const value = selectorColumn.uniqueValues[selectorColumn.indices[i]];
                        columns.get(selectorColumn.columnName)!.push(value);
                    }

                    // Add result values
                    for (const resultColumn of perFluidTable.resultColumns) {
                        columns.get(resultColumn.columnName)!.push(resultColumn.columnValues[i]);
                    }

                    // Add metadata
                    columns.get("ENSEMBLE")!.push(tableSet.ensembleIdent);
                    columns.get("TABLE_NAME")!.push(tableSet.tableName);
                    columns.get("FLUID")!.push(perFluidTable.fluidSelection);

                    rowCount++;
                }

                // Fill missing values in untouched columns
                for (const [, colValues] of columns) {
                    while (colValues.length < rowCount) {
                        colValues.push(null);
                    }
                }
            }
        }

        return new InplaceVolumesTable(columns, rowCount);
    }

    /**
     * Get a column by name
     */
    getColumn(name: string): InplaceVolumesColumn | undefined {
        const values = this.columns.get(name);
        if (!values) return undefined;

        return new InplaceVolumesColumn(name, values);
    }

    /**
     * Split table by one or more columns (nested grouping)
     * Returns a collection of grouped tables
     */
    splitByColumns(columnNames: string[]): InplaceVolumesTableCollection {
        const groups = this.groupByColumns(columnNames);
        return new InplaceVolumesTableCollection(this, columnNames, groups);
    }

    /**
     * Split table by a single column
     */
    splitByColumn(columnName: string): InplaceVolumesTableCollection {
        return this.splitByColumns([columnName]);
    }

    /**
     * Group rows by multiple columns
     * Returns a Map of combined keys to row indices and values
     */
    private groupByColumns(
        columnNames: string[],
    ): Map<string, { indices: number[]; values: (string | number | RegularEnsembleIdent)[] }> {
        const groups = new Map<string, { indices: number[]; values: (string | number | RegularEnsembleIdent)[] }>();

        // Get all columns upfront
        const columns = columnNames.map((name) => this.columns.get(name));

        // Check if all columns exist
        if (columns.some((col) => !col)) {
            return groups;
        }

        for (let i = 0; i < this.rowCount; i++) {
            // Build combined key and collect individual values
            const values: (string | number | RegularEnsembleIdent)[] = [];
            let hasNull = false;

            for (const column of columns) {
                const value = column![i];
                if (value === null) {
                    hasNull = true;
                    break;
                }
                values.push(value);
            }

            if (hasNull) continue;

            // Use pipe separator to create unique combined key
            const combinedKey = values.map((v) => v.toString()).join("|");

            if (!groups.has(combinedKey)) {
                groups.set(combinedKey, { indices: [], values });
            }
            groups.get(combinedKey)!.indices.push(i);
        }

        return groups;
    }

    /**
     * Create a filtered view with only specified rows
     */
    filterByIndices(indices: number[]): InplaceVolumesTable {
        const newColumns = new Map<string, Array<string | number | RegularEnsembleIdent | null>>();

        for (const [colName, colValues] of this.columns) {
            newColumns.set(
                colName,
                indices.map((i) => colValues[i]),
            );
        }

        return new InplaceVolumesTable(newColumns, indices.length);
    }

    /**
     * Get the number of rows
     */
    getRowCount(): number {
        return this.rowCount;
    }

    /**
     * Get all column names
     */
    getColumnNames(): string[] {
        return Array.from(this.columns.keys());
    }
}

/**
 * InplaceVolumes column implementation
 */
export class InplaceVolumesColumn {
    private name: string;
    private values: Array<string | number | RegularEnsembleIdent | null>;

    constructor(name: string, values: Array<string | number | RegularEnsembleIdent | null>) {
        this.name = name;
        this.values = values;
    }

    getName(): string {
        return this.name;
    }

    getAllRowValues(): Array<string | number | RegularEnsembleIdent | null> {
        return this.values;
    }

    getRowValue(index: number): string | number | RegularEnsembleIdent | null {
        return this.values[index];
    }

    getNumRows(): number {
        return this.values.length;
    }
}

/**
 * Collection of grouped tables
 */
export class InplaceVolumesTableCollection {
    private sourceTable: InplaceVolumesTable;
    private collectedBy: string[];
    private groups: Map<string, { indices: number[]; values: (string | number | RegularEnsembleIdent)[] }>;

    constructor(
        sourceTable: InplaceVolumesTable,
        collectedBy: string[],
        groups: Map<string, { indices: number[]; values: (string | number | RegularEnsembleIdent)[] }>,
    ) {
        this.sourceTable = sourceTable;
        this.collectedBy = collectedBy;
        this.groups = groups;
    }

    /**
     * Get the column name(s) used for grouping
     */
    getCollectedBy(): string | string[] {
        return this.collectedBy.length === 1 ? this.collectedBy[0] : this.collectedBy;
    }

    /**
     * Get the grouped tables as a Map
     * Key is the value (or combined values) used for grouping
     */
    getCollectionMap(): Map<string | number | RegularEnsembleIdent, InplaceVolumesTable> {
        const map = new Map<string | number | RegularEnsembleIdent, InplaceVolumesTable>();

        for (const [combinedKey, { indices, values }] of this.groups) {
            // For single column grouping, use the first (only) value as key
            // For multi-column grouping, use the combined key
            const key = this.collectedBy.length === 1 ? values[0] : combinedKey;
            const filtered = this.sourceTable.filterByIndices(indices);
            map.set(key, filtered);
        }

        return map;
    }

    /**
     * Get the grouped tables as an array
     */
    getTables(): InplaceVolumesTable[] {
        return Array.from(this.groups.values()).map(({ indices }) => this.sourceTable.filterByIndices(indices));
    }

    /**
     * Get the keys (values used for grouping) as an array
     */
    getKeys(): (string | number | RegularEnsembleIdent)[] {
        return Array.from(this.groups.values()).map(({ values }) =>
            this.collectedBy.length === 1 ? values[0] : values.join("|"),
        );
    }
}

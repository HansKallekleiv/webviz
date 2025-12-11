import type { EnsembleSet } from "@framework/EnsembleSet";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

import { isConstant } from "./statistics";

export interface GroupedEntry {
    subplotKey: string;
    colorKey: string;
    subplotLabel: string;
    colorLabel: string;
    color: string;
    table: Table;
}

export interface SubplotGroup {
    subplotKey: string;
    subplotLabel: string;
    colorEntries: ColorEntry[];
}

export interface ColorEntry {
    colorKey: string;
    colorLabel: string;
    color: string;
    table: Table;
}

export interface GroupedTableDataOptions {
    table: Table;
    subplotBy: string;
    colorBy: string;
    ensembleSet: EnsembleSet;
    colorSet: ColorSet;
}

/**
 * Groups a table by subplotBy and colorBy columns, providing consistent
 * color assignment and label formatting for both plot and table builders.
 */
export class GroupedTableData {
    private _table: Table;
    private _subplotBy: string;
    private _colorBy: string;
    private _ensembleSet: EnsembleSet;
    private _colorSet: ColorSet;
    private _subplotGroups: SubplotGroup[] = [];
    private _colorMap: Map<string, string> = new Map();
    private _allEntries: GroupedEntry[] = [];

    constructor({ table, subplotBy, colorBy, ensembleSet, colorSet }: GroupedTableDataOptions) {
        this._table = table;
        this._subplotBy = subplotBy;
        this._colorBy = colorBy;
        this._ensembleSet = ensembleSet;
        this._colorSet = colorSet;

        this.buildColorMap(table);
        this.buildGroups(table);
    }

    private buildColorMap(table: Table): void {
        const colorByColumn = table.getColumn(this._colorBy);
        if (!colorByColumn) {
            return;
        }

        const uniqueValues = colorByColumn.getUniqueValues();
        // Create a copy before sorting for consistent color assignment
        const sortedValues = [...uniqueValues].sort((a, b) => a.toString().localeCompare(b.toString()));
        let color = this._colorSet.getFirstColor();

        for (const value of sortedValues) {
            const key = value.toString();

            if (this._colorBy === TableOriginKey.ENSEMBLE) {
                const ensembleIdent = RegularEnsembleIdent.fromString(key);
                const ensemble = this._ensembleSet.findEnsemble(ensembleIdent);
                if (ensemble) {
                    this._colorMap.set(key, ensemble.getColor());
                    continue;
                }
            }

            this._colorMap.set(key, color);
            color = this._colorSet.getNextColor();
        }
    }

    private formatLabel(columnName: string, value: string | number): string {
        if (columnName === TableOriginKey.ENSEMBLE) {
            const ensembleIdent = RegularEnsembleIdent.fromString(value.toString());
            const ensemble = this._ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                return makeDistinguishableEnsembleDisplayName(
                    ensembleIdent,
                    this._ensembleSet.getRegularEnsembleArray(),
                );
            }
        }
        return value.toString();
    }

    private buildGroups(table: Table): void {
        const subplotCollection = table.splitByColumn(this._subplotBy, true);

        for (const [subplotKey, subplotTable] of subplotCollection.getCollectionMap()) {
            const subplotKeyStr = subplotKey.toString();
            const subplotLabel = this.formatLabel(this._subplotBy, subplotKey);

            // If subplotBy and colorBy are the same, don't split again
            const colorByCollection =
                this._subplotBy === this._colorBy
                    ? new Map([[subplotKey, subplotTable]])
                    : subplotTable.splitByColumn(this._colorBy, true).getCollectionMap();

            const colorEntries: ColorEntry[] = [];

            for (const [colorByKey, colorByTable] of colorByCollection) {
                const colorKeyStr = colorByKey.toString();
                const colorLabel = this.formatLabel(this._colorBy, colorByKey);
                const color = this._colorMap.get(colorKeyStr) ?? this._colorSet.getFirstColor();

                const colorEntry: ColorEntry = {
                    colorKey: colorKeyStr,
                    colorLabel,
                    color,
                    table: colorByTable,
                };

                colorEntries.push(colorEntry);

                this._allEntries.push({
                    subplotKey: subplotKeyStr,
                    colorKey: colorKeyStr,
                    subplotLabel,
                    colorLabel,
                    color,
                    table: colorByTable,
                });
            }

            this._subplotGroups.push({
                subplotKey: subplotKeyStr,
                subplotLabel,
                colorEntries,
            });
        }
    }

    getSubplotBy(): string {
        return this._subplotBy;
    }

    getColorBy(): string {
        return this._colorBy;
    }

    getTable(): Table {
        return this._table;
    }

    getSubplotGroups(): SubplotGroup[] {
        return this._subplotGroups;
    }

    getColorMap(): Map<string, string> {
        return this._colorMap;
    }

    getAllEntries(): GroupedEntry[] {
        return this._allEntries;
    }

    getNumSubplots(): number {
        return this._subplotGroups.length;
    }

    getFormatLabelFunction(): (columnName: string, value: string | number) => string {
        return (columnName: string, value: string | number) => this.formatLabel(columnName, value);
    }

    /**
     * Filters out grouped entries where all values in the specified column are constant
     * (i.e., have zero variance). This modifies the internal state.
     */
    filterConstantEntries(columnName: string): void {
        // Filter allEntries
        this._allEntries = this._allEntries.filter((entry) => {
            return !this.isConstantColumn(entry.table, columnName);
        });

        // Filter colorEntries within each subplot group and remove empty groups
        this._subplotGroups = this._subplotGroups
            .map((group) => ({
                ...group,
                colorEntries: group.colorEntries.filter((entry) => {
                    return !this.isConstantColumn(entry.table, columnName);
                }),
            }))
            .filter((group) => group.colorEntries.length > 0);
    }

    /**
     * Checks if all values in a column are constant (same value or zero variance)
     */
    private isConstantColumn(table: Table, columnName: string): boolean {
        const column = table.getColumn(columnName);
        if (!column) {
            return true; // Treat missing columns as constant
        }

        const values = column.getAllRowValues() as number[];
        return isConstant(values);
    }
}

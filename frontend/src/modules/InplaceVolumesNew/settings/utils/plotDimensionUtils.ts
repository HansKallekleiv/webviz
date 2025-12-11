import type { DropdownOption } from "@lib/components/Dropdown";
import type { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

export function makeSubplotByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedTableNames: string[],
): DropdownOption<string>[] {
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    const options: DropdownOption<string>[] = [
        {
            value: TableOriginKey.ENSEMBLE,
            label: "ENSEMBLE",
        },
        {
            value: TableOriginKey.TABLE_NAME,
            label: "TABLE NAME",
        },
    ];

    if (numEnsembleIdents > 1 && numTableNames > 1) {
        return options;
    }

    for (const indexWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        options.push({
            value: indexWithValues.indexColumn,
            label: indexWithValues.indexColumn,
        });
    }

    return options;
}
export function makeColorByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedSubplotBy: string,
    selectedTableNames: string[],
): DropdownOption<string>[] {
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    const ensembleMultiple = numEnsembleIdents > 1;
    const tableMultiple = numTableNames > 1;
    const bothMultiple = ensembleMultiple && tableMultiple;

    // 1. CRITICAL CONSTRAINT: Both are multiple.
    // If both are multiple, we have zero flexibility.
    // One MUST be Subplot, the other MUST be Color.
    if (bothMultiple) {
        if (selectedSubplotBy === TableOriginKey.ENSEMBLE) {
            return [{ value: TableOriginKey.TABLE_NAME, label: "TABLE NAME" }];
        }
        if (selectedSubplotBy === TableOriginKey.TABLE_NAME) {
            return [{ value: TableOriginKey.ENSEMBLE, label: "ENSEMBLE" }];
        }
        // If subplot is somehow an index (invalid state for bothMultiple), default to Ensemble.
        return [{ value: TableOriginKey.ENSEMBLE, label: "ENSEMBLE" }];
    }

    // 2. VISIBILITY CONSTRAINT: One is multiple.
    // If a dimension is multiple, it MUST be used in either Subplot or Color.

    // Case A: Ensemble is multiple, but NOT used in Subplot.
    // We MUST Color by Ensemble to show the data.
    if (ensembleMultiple && selectedSubplotBy !== TableOriginKey.ENSEMBLE) {
        return [{ value: TableOriginKey.ENSEMBLE, label: "ENSEMBLE" }];
    }

    // Case B: Table is multiple, but NOT used in Subplot.
    // We MUST Color by Table to show the data.
    if (tableMultiple && selectedSubplotBy !== TableOriginKey.TABLE_NAME) {
        return [{ value: TableOriginKey.TABLE_NAME, label: "TABLE NAME" }];
    }

    // 3. FREE CHOICE
    // If we reach here, all "Multiple" constraints are satisfied (or don't exist).
    // The user can select whatever they want, including repeating the Subplot selection.

    const options: DropdownOption<string>[] = [
        { value: TableOriginKey.ENSEMBLE, label: "ENSEMBLE" },
        { value: TableOriginKey.TABLE_NAME, label: "TABLE NAME" },
    ];

    // Add indices (standard practice: exclude the one currently used for subplot to avoid X vs X graphs)
    for (const indexWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        if (selectedSubplotBy !== indexWithValues.indexColumn) {
            options.push({
                value: indexWithValues.indexColumn,
                label: indexWithValues.indexColumn,
            });
        }
    }

    return options;
}

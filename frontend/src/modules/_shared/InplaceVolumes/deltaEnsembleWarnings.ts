import type { EnsembleSet } from "@framework/EnsembleSet";
import { makeDistinguishableEnsembleDisplayName } from "@modules/_shared/ensembleNameUtils";

import { formatTableDisplayName } from "./tableIdentUtils";
import type { DeltaDroppedFluidSelections, DeltaUnmatchedRows } from "./types";

/**
 * Warn about fluid selections left out because only one ensemble has them.
 */
export function makeDroppedFluidSelectionWarnings(
    droppedFluidSelections: DeltaDroppedFluidSelections[],
    ensembleSet: EnsembleSet,
): string[] {
    const warnings: string[] = [];

    for (const dropped of droppedFluidSelections) {
        const name = makeDistinguishableEnsembleDisplayName(dropped.ensembleIdent, ensembleSet.getEnsembleArray());
        const tableDisplayName = formatTableDisplayName(dropped.tableName);
        for (const missingFrom of ["comparison", "reference"] as const) {
            const fluidSelections = dropped.fluidSelections
                .filter((entry) => entry.missingFrom === missingFrom)
                .map((entry) => entry.fluidSelection);
            if (fluidSelections.length === 0) {
                continue;
            }
            warnings.push(
                `Delta ensemble "${name}" (${tableDisplayName}): ${fluidSelections.join(", ")} ` +
                    `not present in the ${missingFrom} ensemble, so excluded from the difference.`,
            );
        }
    }

    return warnings;
}

export function makeUnmatchedDeltaRowWarnings(unmatchedRows: DeltaUnmatchedRows[], ensembleSet: EnsembleSet): string[] {
    return unmatchedRows.flatMap(function makeTableRowWarnings(unmatched) {
        const name = makeDistinguishableEnsembleDisplayName(unmatched.ensembleIdent, ensembleSet.getEnsembleArray());
        const tableDisplayName = formatTableDisplayName(unmatched.tableName);
        return unmatched.rows.map(
            (rows) =>
                `Delta ensemble "${name}" (${tableDisplayName}, ${rows.fluidSelection}): ` +
                `${rows.comparisonOnlyRowCount} comparison and ${rows.referenceOnlyRowCount} reference rows had no matching selector tuple and were excluded.`,
        );
    });
}

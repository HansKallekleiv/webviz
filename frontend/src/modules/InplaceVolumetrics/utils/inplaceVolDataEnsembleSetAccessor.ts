import { InplaceVolumetricsIndexNames_api, InplaceVolumetricsIndex_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { InplaceVolDataEnsembleSet, PlotGroupingEnum } from "../typesAndEnums";

type InplaceVolTableRow = {
    [key: string]: number | string | number[];
};

export type InplaceVolGroupedResultValues = {
    groupName: string | number;
    subgroups: InplaceVolSubgroupResultValues[];
};

type InplaceVolSubgroupResultValues = {
    subgroupName: string | number;
    resultValues: number[];
    realizations: number[];
};
export function createInplaceVolTable(tableCollections: InplaceVolDataEnsembleSet[]): InplaceVolTableRow[] {
    const table: InplaceVolTableRow[] = [];

    tableCollections.forEach((tableCollection) => {
        let indexNames: string[] = [];
        // Use indix_names from the first response set that has data then break out of the loop
        tableCollection.responseSetData.some((responseSet) => {
            // Check if responseSet has data and indexNames is empty
            if (responseSet.data && !indexNames.length) {
                indexNames = responseSet.data.index_names;
                responseSet.data.entries.forEach((entry) => {
                    const row: InplaceVolTableRow = {
                        Ensemble: tableCollection.ensembleIdentString,
                        realizations: responseSet.data?.realizations || [],
                    };
                    entry.index_values.forEach((value, index) => {
                        row[indexNames[index]] = value;
                    });
                    // table.push(row);
                });
            }
            return indexNames.length > 0;
        });

        if (indexNames.length === 0) {
            return [];
        }

        tableCollection.responseSetData.forEach((responseSet) => {
            if (responseSet.data) {
                responseSet.data.entries.forEach((entry, index) => {
                    responseSet.data?.realizations ||
                        [].map((realization, realIndex) => {
                            const row: InplaceVolTableRow = {
                                Ensemble: tableCollection.ensembleIdentString,
                                realization: realization,
                            };
                            entry.index_values.forEach((value, index) => {
                                row[indexNames[index]] = value;
                            });
                            row[responseSet.responseName] = entry.result_values[realIndex];
                            table.push(row);
                        });
                });
            }
        });
    });

    return table;
}
export function filterInplaceVolTableOnRealizations(
    rows: InplaceVolTableRow[],
    realizations: number[]
): InplaceVolTableRow[] {
    return rows.filter((row) => {
        return realizations.every((realization) => {
            const allRealizations = row["realizations"] as number[];

            return allRealizations.includes(realization);
        });
    });
}

export function filterInplaceVolTableOnIndex(
    rows: InplaceVolTableRow[],
    indexFilters: InplaceVolumetricsIndex_api[]
): InplaceVolTableRow[] {
    return rows.filter((row) => {
        return indexFilters.every((filter) => {
            const value = row[filter.index_name];
            return value !== undefined && filter.values.includes(value as string | number);
        });
    });
}
export function getGroupedInplaceVolResult(
    table: InplaceVolTableRow[],
    resultName: string,
    groupBy: PlotGroupingEnum,
    subgroupBy: string
): InplaceVolGroupedResultValues[] {
    if (groupBy !== PlotGroupingEnum.ENSEMBLE && subgroupBy !== PlotGroupingEnum.ENSEMBLE) {
        const ensembleList = table.map((row) => row["Ensemble"] as string);
        const uniqueEnsembles = [...new Set(ensembleList)];
        if (uniqueEnsembles.length === 1) {
            throw new Error("Only one ensemble is allowed when groupBy and subgroupBy are not ENSEMBLE");
        }
    }
    // Check if resultName is in the table
    if (!table.length || !table[0].hasOwnProperty(resultName)) {
        return [];
    }

    const groupedRows = getTableGroupingValues(table, groupBy);
    const subgroups = groupedRows.map((group) => ({
        groupName: group.key,
        subgroups: getSubgroups(resultName, group.rows, subgroupBy),
    }));

    return subgroups;
}

function getTableGroupingValues(
    table: InplaceVolTableRow[],
    groupByIndexName: keyof InplaceVolTableRow
): { key: string | number; rows: InplaceVolTableRow[] }[] {
    const acc: Record<string | number, InplaceVolTableRow[]> = {};
    table.forEach((row) => {
        const groupByValue = row[groupByIndexName];
        if (groupByValue !== undefined) {
            const key = typeof groupByValue === "number" ? groupByValue : groupByValue.toString();
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(row);
        }
    });
    return Object.entries(acc).map(([key, rows]) => ({ key, rows }));
}

function getSubgroups(
    resultName: string,
    rows: InplaceVolTableRow[],
    subgroupBy: keyof InplaceVolTableRow
): InplaceVolSubgroupResultValues[] {
    const subgroupAcc: Record<string | number, InplaceVolTableRow[]> = {};
    rows.forEach((row) => {
        const subgroupValue = row[subgroupBy];
        if (subgroupValue !== undefined) {
            const key = typeof subgroupValue === "number" ? subgroupValue : subgroupValue.toString();
            if (!subgroupAcc[key]) {
                subgroupAcc[key] = [];
            }
            subgroupAcc[key].push(row);
        }
    });

    return Object.entries(subgroupAcc).map(([subgroupName, rows]) => {
        // Realizations are the same for all rows. pickign first.
        const realizations = rows[0]["realizations"] as number[];

        return {
            subgroupName,
            resultValues: sumResultValues(resultName, rows),
            realizations: realizations,
        };
    });
}

function sumResultValues(resultName: string, rows: InplaceVolTableRow[]): number[] {
    let sums: number[] = [];
    rows.forEach((row) => {
        const resultValues = row[resultName] as number[];
        resultValues.forEach((value, index) => {
            sums[index] = (sums[index] || 0) + value;
        });
    });
    return sums;
}

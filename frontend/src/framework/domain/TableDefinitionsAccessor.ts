import { isEqual } from "lodash-es";

import { ORDERED_VOLUME_DEFINITIONS } from "@assets/volumeDefinitions";

import type { InplaceVolumesIndexWithValues_api, InplaceVolumesTableDefinition_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type TableDefinitionsForEnsembleIdent = {
    ensembleIdent: RegularEnsembleIdent;
    tableDefinitions: readonly InplaceVolumesTableDefinition_api[];
};

export enum IndexValueCriteria {
    ALLOW_INTERSECTION = "allow_intersection",
    REQUIRE_EQUALITY = "require_equality",
}

export function makeUniqueTableNamesIntersection(
    tableDefinitionsPerEnsembleIdent: readonly TableDefinitionsForEnsembleIdent[],
): string[] {
    if (tableDefinitionsPerEnsembleIdent.length === 0) {
        return [];
    }

    const tableNames = new Set(tableDefinitionsPerEnsembleIdent[0].tableDefinitions.map((item) => item.tableName));
    for (const { tableDefinitions } of tableDefinitionsPerEnsembleIdent.slice(1)) {
        const currentTableNames = new Set(tableDefinitions.map((item) => item.tableName));
        for (const tableName of tableNames) {
            if (!currentTableNames.has(tableName)) {
                tableNames.delete(tableName);
            }
        }
    }
    return Array.from(tableNames);
}

export class TableDefinitionsAccessor {
    private readonly _ensembleIdents: readonly RegularEnsembleIdent[];
    private readonly _tableNames: readonly string[];
    private readonly _resultNames: readonly string[];
    private readonly _indicesWithValues: readonly InplaceVolumesIndexWithValues_api[];
    private readonly _areTablesComparable: boolean;

    constructor(
        definitionsByEnsemble: readonly TableDefinitionsForEnsembleIdent[],
        tableNamesFilter: readonly string[],
        indexValueCriteria: IndexValueCriteria,
    ) {
        this._ensembleIdents = definitionsByEnsemble.map((item) => item.ensembleIdent);
        this._tableNames = makeUniqueTableNamesIntersection(definitionsByEnsemble);

        const selectedDefinitions = definitionsByEnsemble
            .flatMap((item) => item.tableDefinitions)
            .filter((definition) => tableNamesFilter.includes(definition.tableName));
        const intersection = makeDefinitionIntersection(selectedDefinitions, indexValueCriteria);
        this._resultNames = intersection.resultNames;
        this._indicesWithValues = intersection.indicesWithValues;
        this._areTablesComparable = intersection.areTablesComparable;
    }

    getUniqueEnsembleIdents(): readonly RegularEnsembleIdent[] {
        return this._ensembleIdents;
    }

    getTableNamesIntersection(): readonly string[] {
        return this._tableNames;
    }

    getResultNamesIntersection(): readonly string[] {
        return this._resultNames;
    }

    getCommonIndicesWithValues(): readonly InplaceVolumesIndexWithValues_api[] {
        return this._indicesWithValues;
    }

    getCommonSelectorColumns(): readonly string[] {
        return ["REAL", ...this._indicesWithValues.map((item) => item.indexColumn)];
    }

    getAreTablesComparable(): boolean {
        return this._areTablesComparable;
    }

    hasEnsembleIdents(ensembleIdents: readonly RegularEnsembleIdent[]): boolean {
        return ensembleIdents.every((ensembleIdent) => this._ensembleIdents.includes(ensembleIdent));
    }

    hasTableNames(tableNames: readonly string[]): boolean {
        return tableNames.every((tableName) => this._tableNames.includes(tableName));
    }

    hasResultNames(resultNames: readonly string[]): boolean {
        return resultNames.every((resultName) => this._resultNames.includes(resultName));
    }

    hasResultName(resultName: string): boolean {
        return this._resultNames.includes(resultName);
    }

    hasIndicesWithValues(indicesWithValues: readonly InplaceVolumesIndexWithValues_api[]): boolean {
        return indicesWithValues.every(({ indexColumn, values }) => {
            const commonIndex = this._indicesWithValues.find((item) => item.indexColumn === indexColumn);
            return commonIndex !== undefined && values.every((value) => commonIndex.values.includes(value));
        });
    }
}

function makeDefinitionIntersection(
    definitions: readonly InplaceVolumesTableDefinition_api[],
    indexValueCriteria: IndexValueCriteria,
): {
    resultNames: string[];
    indicesWithValues: InplaceVolumesIndexWithValues_api[];
    areTablesComparable: boolean;
} {
    if (definitions.length === 0) {
        return { resultNames: [], indicesWithValues: [], areTablesComparable: false };
    }

    const resultNames = new Set(definitions[0].resultNames);
    const indices = new Map<string, InplaceVolumesIndexWithValues_api>();
    for (const { indexColumn, values } of definitions[0].indicesWithValues) {
        if (indices.has(indexColumn)) {
            throw new Error(`Duplicate index ${indexColumn}`);
        }
        indices.set(indexColumn, { indexColumn, values: [...values] });
    }
    let areTablesComparable = true;

    for (const definition of definitions.slice(1)) {
        for (const resultName of resultNames) {
            if (!definition.resultNames.includes(resultName)) {
                resultNames.delete(resultName);
            }
        }

        for (const [indexColumn, indexWithValues] of indices) {
            const current = definition.indicesWithValues.find((item) => item.indexColumn === indexColumn);
            if (!current) {
                indices.delete(indexColumn);
                continue;
            }

            if (indexValueCriteria === IndexValueCriteria.ALLOW_INTERSECTION) {
                const currentValues = new Set(current.values);
                indexWithValues.values = indexWithValues.values.filter((value) => currentValues.has(value));
            } else if (!isEqual([...indexWithValues.values].sort(), [...current.values].sort())) {
                areTablesComparable = false;
            }
        }
    }

    const orderedResultNames = Object.keys(ORDERED_VOLUME_DEFINITIONS).filter((name) => resultNames.delete(name));
    orderedResultNames.push(...resultNames);

    return {
        resultNames: orderedResultNames,
        indicesWithValues: Array.from(indices.values()),
        areTablesComparable: areTablesComparable && indices.size > 0,
    };
}
import { describe, expect, test } from "vitest";

import type { InplaceVolumesTableDefinition_api } from "@api";
import {
    IndexValueCriteria,
    TableDefinitionsAccessor,
    makeUniqueTableNamesIntersection,
} from "@framework/domain/TableDefinitionsAccessor";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

const firstDefinition: InplaceVolumesTableDefinition_api = {
    tableName: "grid",
    resultNames: ["STOIIP", "GIIP", "PORO"],
    indicesWithValues: [
        { indexColumn: "ZONE", values: ["Zone 2", "Zone 1"] },
        { indexColumn: "REGION", values: ["1", "2"] },
    ],
};
const secondDefinition: InplaceVolumesTableDefinition_api = {
    tableName: "grid",
    resultNames: ["GIIP", "STOIIP"],
    indicesWithValues: [
        { indexColumn: "ZONE", values: ["Zone 1", "Zone 2"] },
        { indexColumn: "REGION", values: ["2"] },
    ],
};

describe("TableDefinitionsAccessor", () => {
    test("intersects table names across ensembles", () => {
        const definitions = [
            {
                ensembleIdent: {} as RegularEnsembleIdent,
                tableDefinitions: [firstDefinition, { ...firstDefinition, tableName: "other" }],
            },
            { ensembleIdent: {} as RegularEnsembleIdent, tableDefinitions: [secondDefinition] },
        ];
        expect(makeUniqueTableNamesIntersection(definitions)).toEqual(["grid"]);
    });

    test("intersects results, index columns, and values without mutating API data", () => {
        const originalFirstValues = [...firstDefinition.indicesWithValues[0].values];
        const accessor = new TableDefinitionsAccessor(
            [
                { ensembleIdent: {} as RegularEnsembleIdent, tableDefinitions: [firstDefinition] },
                { ensembleIdent: {} as RegularEnsembleIdent, tableDefinitions: [secondDefinition] },
            ],
            ["grid"],
            IndexValueCriteria.ALLOW_INTERSECTION,
        );

        expect(accessor.getResultNamesIntersection()).toEqual(["STOIIP", "GIIP"]);
        expect(accessor.getCommonIndicesWithValues()).toEqual([
            { indexColumn: "ZONE", values: ["Zone 2", "Zone 1"] },
            { indexColumn: "REGION", values: ["2"] },
        ]);
        expect(accessor.getCommonSelectorColumns()).toEqual(["REAL", "ZONE", "REGION"]);
        expect(accessor.hasIndicesWithValues([{ indexColumn: "REGION", values: ["2"] }])).toBe(true);
        expect(accessor.getAreTablesComparable()).toBe(true);
        expect(firstDefinition.indicesWithValues[0].values).toEqual(originalFirstValues);
    });

    test("requires equal index values without depending on value order", () => {
        const accessor = new TableDefinitionsAccessor(
            [
                { ensembleIdent: {} as RegularEnsembleIdent, tableDefinitions: [firstDefinition] },
                { ensembleIdent: {} as RegularEnsembleIdent, tableDefinitions: [secondDefinition] },
            ],
            ["grid"],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.getAreTablesComparable()).toBe(false);
    });
});
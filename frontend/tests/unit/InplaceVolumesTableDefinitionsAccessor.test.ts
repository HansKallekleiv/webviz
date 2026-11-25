import { describe, expect, test } from "vitest";

import type { InplaceVolumesTableDefinition_api } from "@api";
import { InplaceVolumesTableSource_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IndexValueCriteria, TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { encodeTableKey } from "@modules/_shared/InplaceVolumes/tableIdentUtils";

const REFERENCE_ENSEMBLE_IDENT = new RegularEnsembleIdent("11111111-2222-3333-8444-555555555555", "iter-0");
const COMPARISON_ENSEMBLE_IDENT = new RegularEnsembleIdent("66666666-7777-4888-9999-000000000000", "iter-0");

const TABLE_NAME = "geogrid";

function makeTableDefinition(
    indicesWithValues: { indexColumn: string; values: string[] }[],
    tableName = TABLE_NAME,
    tableSource = InplaceVolumesTableSource_api.STATIC,
    resultNames = ["BULK", "PORV", "HCPV", "STOIIP"],
): InplaceVolumesTableDefinition_api {
    return {
        tableName,
        tableSource,
        resultNames,
        indicesWithValues,
    };
}

function makeAccessor(
    referenceIndices: { indexColumn: string; values: string[] }[],
    comparisonIndices: { indexColumn: string; values: string[] }[],
    indexValueCriteria: IndexValueCriteria,
): TableDefinitionsAccessor {
    return new TableDefinitionsAccessor(
        [
            {
                ensembleIdent: REFERENCE_ENSEMBLE_IDENT,
                tableDefinitions: [makeTableDefinition(referenceIndices)],
            },
            {
                ensembleIdent: COMPARISON_ENSEMBLE_IDENT,
                tableDefinitions: [makeTableDefinition(comparisonIndices)],
            },
        ],
        [TABLE_NAME],
        indexValueCriteria,
    );
}

describe("TableDefinitionsAccessor index value handling", () => {
    test("reports only the index columns whose values differ", () => {
        const accessor = makeAccessor(
            [
                { indexColumn: "ZONE", values: ["A", "B"] },
                { indexColumn: "REGION", values: ["North", "South"] },
            ],
            [
                { indexColumn: "ZONE", values: ["A", "B"] },
                { indexColumn: "REGION", values: ["North", "West"] },
            ],
            IndexValueCriteria.ALLOW_INTERSECTION,
        );

        expect(accessor.getIndexColumnsWithDifferingValues()).toEqual(["REGION"]);
        expect(accessor.getAreTablesComparable()).toBe(true);
    });

    test("reports differing values regardless of value ordering", () => {
        const accessor = makeAccessor(
            [{ indexColumn: "ZONE", values: ["B", "A"] }],
            [{ indexColumn: "ZONE", values: ["A", "B"] }],
            IndexValueCriteria.ALLOW_INTERSECTION,
        );

        expect(accessor.getIndexColumnsWithDifferingValues()).toEqual([]);
    });

    test("does not mutate the value arrays it is given", () => {
        const referenceValues = ["B", "A"];
        makeAccessor(
            [{ indexColumn: "ZONE", values: referenceValues }],
            [{ indexColumn: "ZONE", values: ["A", "B"] }],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(referenceValues).toEqual(["B", "A"]);
    });

    test("intersects differing values when intersection is allowed", () => {
        const accessor = makeAccessor(
            [{ indexColumn: "REGION", values: ["North", "South"] }],
            [{ indexColumn: "REGION", values: ["North", "West"] }],
            IndexValueCriteria.ALLOW_INTERSECTION,
        );

        expect(accessor.getCommonIndicesWithValues()).toEqual([{ indexColumn: "REGION", values: ["North"] }]);
    });

    test("marks tables as not comparable when equality is required and values differ", () => {
        const accessor = makeAccessor(
            [{ indexColumn: "REGION", values: ["North", "South"] }],
            [{ indexColumn: "REGION", values: ["North", "West"] }],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.getAreTablesComparable()).toBe(false);
    });

    test("drops index columns missing from one source, also when another column has differing values", () => {
        const accessor = makeAccessor(
            [
                { indexColumn: "ZONE", values: ["A", "B"] },
                { indexColumn: "FACIES", values: ["sand"] },
            ],
            [{ indexColumn: "ZONE", values: ["A", "C"] }],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(accessor.getCommonIndicesWithValues().map((index) => index.indexColumn)).toEqual(["ZONE"]);
    });

    test("is not comparable when the sources share no index columns", () => {
        const accessor = makeAccessor(
            [{ indexColumn: "ZONE", values: ["A"] }],
            [{ indexColumn: "REGION", values: ["North"] }],
            IndexValueCriteria.ALLOW_INTERSECTION,
        );

        expect(accessor.getAreTablesComparable()).toBe(false);
    });
});

describe("TableDefinitionsAccessor static and simulator table sources", () => {
    const staticSimgrid = makeTableDefinition(
        [
            { indexColumn: "ZONE", values: ["A", "B"] },
            { indexColumn: "FLUID", values: ["oil", "gas", "water"] },
        ],
        "simgrid",
        InplaceVolumesTableSource_api.STATIC,
        ["BULK", "PORV", "HCPV", "STOIIP"],
    );
    const simulatorSimgrid = makeTableDefinition(
        [
            { indexColumn: "ZONE", values: ["A", "B"] },
            { indexColumn: "FLUID", values: ["oil", "gas"] },
        ],
        "simgrid",
        InplaceVolumesTableSource_api.SIMULATOR,
        ["HCPV", "STOIIP"],
    );

    const staticKey = encodeTableKey("simgrid", InplaceVolumesTableSource_api.STATIC);
    const simulatorKey = encodeTableKey("simgrid", InplaceVolumesTableSource_api.SIMULATOR);

    test("keeps same-name static and simulator tables distinct in the table intersection", () => {
        const accessor = new TableDefinitionsAccessor(
            [{ ensembleIdent: REFERENCE_ENSEMBLE_IDENT, tableDefinitions: [staticSimgrid, simulatorSimgrid] }],
            [staticKey, simulatorKey],
            IndexValueCriteria.ALLOW_INTERSECTION,
        );

        expect(accessor.getTableNamesIntersection()).toEqual(["simgrid", "simulator::simgrid"]);
        expect(accessor.hasTableNames([staticKey, simulatorKey])).toBe(true);
        expect(accessor.getResultNamesIntersection()).toEqual(["STOIIP", "HCPV"]);
    });

    test("reports differing FLUID values and allows comparison with ALLOW_INTERSECTION", () => {
        const strictAccessor = new TableDefinitionsAccessor(
            [{ ensembleIdent: REFERENCE_ENSEMBLE_IDENT, tableDefinitions: [staticSimgrid, simulatorSimgrid] }],
            [staticKey, simulatorKey],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(strictAccessor.getAreTablesComparable()).toBe(false);
        expect(strictAccessor.getIndexColumnsWithDifferingValues()).toEqual(["FLUID"]);

        const intersectedAccessor = new TableDefinitionsAccessor(
            [{ ensembleIdent: REFERENCE_ENSEMBLE_IDENT, tableDefinitions: [staticSimgrid, simulatorSimgrid] }],
            [staticKey, simulatorKey],
            IndexValueCriteria.ALLOW_INTERSECTION,
        );

        expect(intersectedAccessor.getAreTablesComparable()).toBe(true);
        expect(intersectedAccessor.getIndexColumnsWithDifferingValues()).toEqual(["FLUID"]);
        expect(intersectedAccessor.getCommonIndicesWithValues()).toEqual([
            { indexColumn: "ZONE", values: ["A", "B"] },
            { indexColumn: "FLUID", values: ["oil", "gas"] },
        ]);
    });

    test("filters only the selected table source when static and simulator share a name", () => {
        const simulatorOnlyAccessor = new TableDefinitionsAccessor(
            [{ ensembleIdent: REFERENCE_ENSEMBLE_IDENT, tableDefinitions: [staticSimgrid, simulatorSimgrid] }],
            [simulatorKey],
            IndexValueCriteria.REQUIRE_EQUALITY,
        );

        expect(simulatorOnlyAccessor.getAreTablesComparable()).toBe(true);
        expect(simulatorOnlyAccessor.getCommonIndicesWithValues()).toEqual([
            { indexColumn: "ZONE", values: ["A", "B"] },
            { indexColumn: "FLUID", values: ["oil", "gas"] },
        ]);
        expect(simulatorOnlyAccessor.getResultNamesIntersection()).toEqual(["STOIIP", "HCPV"]);
    });
});

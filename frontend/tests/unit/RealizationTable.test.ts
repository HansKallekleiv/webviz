import { describe, expect, test } from "vitest";

import type { DataAddress } from "@framework/domain/DataAddress";
import { computeGroupedStatistics, computeStatistics } from "@framework/domain/groupedStatistics";
import {
    deriveParameterColumn,
    deriveSensitivityColumn,
    makeParameterColumnName,
    SENSITIVITY_CASE_COLUMN,
    SENSITIVITY_NAME_COLUMN,
    type RealizationTable,
} from "@framework/domain/RealizationTable";
import { EnsembleParameters, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSensitivities, SensitivityType } from "@framework/EnsembleSensitivities";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

function makeTable(): RealizationTable {
    return {
        keyColumns: { realization: new Int32Array([1, 2, 3]) },
        indexColumns: { ZONE: ["A", "A", "B"] },
        valueColumns: [{ name: "STOIIP", unit: "m3", values: new Float64Array([10, 20, 100]) }],
        origin: {
            ensemble: {} as RegularEnsembleIdent,
            address: {} as DataAddress,
        },
    };
}

describe("RealizationTable", () => {
    test("derives row-aligned sensitivity name and case columns", () => {
        const table = makeTable();
        const sensitivities = new EnsembleSensitivities([
            {
                name: "rms_seed",
                type: SensitivityType.MONTECARLO,
                cases: [{ name: "p10_p90", realizations: [1, 3] }],
            },
        ]);

        const derived = deriveSensitivityColumn(table, sensitivities);

        expect(derived).not.toBe(table);
        expect(derived.indexColumns[SENSITIVITY_NAME_COLUMN]).toEqual(["rms_seed", null, "rms_seed"]);
        expect(derived.indexColumns[SENSITIVITY_CASE_COLUMN]).toEqual(["p10_p90", null, "p10_p90"]);
        expect(table.indexColumns[SENSITIVITY_NAME_COLUMN]).toBeUndefined();
        expect(deriveSensitivityColumn(table, null)).toBe(table);
    });

    test("derives typed numeric and nullable discrete parameter columns", () => {
        const numericIdent = new ParameterIdent("PORO", null);
        const discreteIdent = new ParameterIdent("FACIES", "GEO");
        const parameters = new EnsembleParameters([
            {
                type: ParameterType.CONTINUOUS,
                name: numericIdent.name,
                groupName: numericIdent.groupName,
                description: null,
                isConstant: false,
                isLogarithmic: false,
                realizations: [1, 2, 3],
                values: [0.1, 0.2, 0.3],
            },
            {
                type: ParameterType.DISCRETE,
                name: discreteIdent.name,
                groupName: discreteIdent.groupName,
                description: null,
                isConstant: false,
                isNumerical: false,
                realizations: [1, 3],
                values: ["sand", "shale"],
            },
        ]);

        const numeric = deriveParameterColumn(makeTable(), parameters, numericIdent);
        const discrete = deriveParameterColumn(numeric, parameters, discreteIdent);

        expect(numeric.indexColumns[makeParameterColumnName(numericIdent)]).toEqual(new Float64Array([0.1, 0.2, 0.3]));
        expect(discrete.indexColumns[makeParameterColumnName(discreteIdent)]).toEqual(["sand", null, "shale"]);
        const unchangedTable = makeTable();
        expect(deriveParameterColumn(unchangedTable, parameters, new ParameterIdent("missing", null))).toBe(
            unchangedTable,
        );
    });

    test("computes reserves statistics and groups every value column", () => {
        const statistics = computeStatistics([10, 20, 100]);
        expect(statistics).toEqual({
            count: 3,
            mean: 130 / 3,
            stdDev: expect.closeTo(49.32882862316247),
            min: 10,
            max: 100,
            p10: 84,
            p90: 12,
        });

        const grouped = computeGroupedStatistics(makeTable(), ["ZONE"]);
        expect(grouped).toHaveLength(2);
        expect(grouped[0].group).toEqual({ ZONE: "A" });
        expect(grouped[0].valueStatistics.STOIIP.mean).toBe(15);
        expect(grouped[1].group).toEqual({ ZONE: "B" });
        expect(grouped[1].valueStatistics.STOIIP.stdDev).toBe(0);
    });
});
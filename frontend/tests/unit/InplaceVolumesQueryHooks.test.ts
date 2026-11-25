import type { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import type {
    InplaceVolumesStatisticalTableDataPerFluidSelection_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    ResultWithWarnings,
} from "@api";
import { InplaceVolumesTableSource_api } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import {
    makeAggregatedPerRealizationDeltaTableDataQueryOptions,
    makeAggregatedPerRealizationTableDataQueryOptions,
    makeAggregatedStatisticalTableDataQueryOptionsFromSources,
} from "@modules/_shared/InplaceVolumes/queryHooks";
import { encodeTableKey } from "@modules/_shared/InplaceVolumes/tableIdentUtils";

const ENSEMBLE_A = new RegularEnsembleIdent("11111111-1111-4111-8111-111111111111", "iter-0");
const ENSEMBLE_B = new RegularEnsembleIdent("22222222-2222-4222-8222-222222222222", "iter-1");
const DELTA_ENSEMBLE = new DeltaEnsembleIdent(ENSEMBLE_A, ENSEMBLE_B);

const INDICES = [{ indexColumn: "FLUID", values: ["oil"] }];
const STATIC_KEY = encodeTableKey("simgrid", InplaceVolumesTableSource_api.STATIC);
const SIMULATOR_KEY = encodeTableKey("simgrid", InplaceVolumesTableSource_api.SIMULATOR);

function extractQueryParams(queryKey: readonly unknown[]): Record<string, unknown> {
    const firstEntry = queryKey[0] as { query?: Record<string, unknown> };
    return firstEntry.query ?? {};
}

function makeQueryResult<T>(value: T, warnings: string[] = []): UseQueryResult<ResultWithWarnings<T>, Error> {
    return {
        data: { value, warnings },
        error: null,
        isError: false,
        isFetching: false,
    } as UseQueryResult<ResultWithWarnings<T>, Error>;
}

describe("InplaceVolumes queryHooks table source decoding and warning formatting", () => {
    test("makeAggregatedStatisticalTableDataQueryOptionsFromSources decodes table_name and table_source", () => {
        const { queries, combine } = makeAggregatedStatisticalTableDataQueryOptionsFromSources(
            [
                { ensembleIdent: ENSEMBLE_A, realizations: [0, 1], tableName: STATIC_KEY },
                { ensembleIdent: ENSEMBLE_A, realizations: [0, 1], tableName: SIMULATOR_KEY },
            ],
            ["STOIIP"],
            ["ZONE"],
            INDICES,
            true,
        );

        const staticQuery = extractQueryParams(queries[0]().queryKey);
        const simulatorQuery = extractQueryParams(queries[1]().queryKey);

        expect(staticQuery.table_name).toBe("simgrid");
        expect(staticQuery.table_source).toBe(InplaceVolumesTableSource_api.STATIC);
        expect(simulatorQuery.table_name).toBe("simgrid");
        expect(simulatorQuery.table_source).toBe(InplaceVolumesTableSource_api.SIMULATOR);

        const emptyStatisticalData: InplaceVolumesStatisticalTableDataPerFluidSelection_api = {
            tableDataPerFluidSelection: [],
        };
        const combined = combine([
            makeQueryResult(emptyStatisticalData, ["Missing realization 1"]),
            makeQueryResult(emptyStatisticalData, ["Dropped 2 unmapped FIPNUMs"]),
        ]);

        expect(combined.tablesData.map((t) => t.tableName)).toEqual([STATIC_KEY, SIMULATOR_KEY]);
        expect(combined.warnings).toEqual([
            'iter-0, table "simgrid": Missing realization 1',
            'iter-0, table "simgrid (simulator)": Dropped 2 unmapped FIPNUMs',
        ]);
    });

    test("makeAggregatedPerRealizationTableDataQueryOptions decodes table_name and table_source", () => {
        const { queries, combine } = makeAggregatedPerRealizationTableDataQueryOptions(
            [{ ensembleIdent: ENSEMBLE_A, realizations: [0, 1] }],
            [STATIC_KEY, SIMULATOR_KEY],
            ["STOIIP"],
            ["ZONE"],
            INDICES,
            true,
        );

        const staticQuery = extractQueryParams(queries[0]().queryKey);
        const simulatorQuery = extractQueryParams(queries[1]().queryKey);

        expect(staticQuery.table_name).toBe("simgrid");
        expect(staticQuery.table_source).toBe(InplaceVolumesTableSource_api.STATIC);
        expect(simulatorQuery.table_name).toBe("simgrid");
        expect(simulatorQuery.table_source).toBe(InplaceVolumesTableSource_api.SIMULATOR);

        const emptyPerRealData: InplaceVolumesTableDataPerFluidSelection_api = {
            tableDataPerFluidSelection: [],
        };
        const combined = combine([
            makeQueryResult(emptyPerRealData),
            makeQueryResult(emptyPerRealData, ["Unmapped FIPNUM 99"]),
        ]);

        expect(combined.tablesData.map((t) => t.tableName)).toEqual([STATIC_KEY, SIMULATOR_KEY]);
        expect(combined.warnings).toEqual(['iter-0, table "simgrid (simulator)": Unmapped FIPNUM 99']);
    });

    test("makeAggregatedPerRealizationDeltaTableDataQueryOptions decodes table_source and formats delta warnings", () => {
        const { queries, combine } = makeAggregatedPerRealizationDeltaTableDataQueryOptions(
            [{ ensembleIdent: DELTA_ENSEMBLE, realizations: [0, 1] }],
            [SIMULATOR_KEY],
            ["STOIIP"],
            ["ZONE"],
            INDICES,
            true,
        );

        expect(queries).toHaveLength(2);
        const comparisonQuery = extractQueryParams(queries[0]().queryKey);
        const referenceQuery = extractQueryParams(queries[1]().queryKey);

        expect(comparisonQuery.table_name).toBe("simgrid");
        expect(comparisonQuery.table_source).toBe(InplaceVolumesTableSource_api.SIMULATOR);
        expect(referenceQuery.table_name).toBe("simgrid");
        expect(referenceQuery.table_source).toBe(InplaceVolumesTableSource_api.SIMULATOR);

        const emptyPerRealData: InplaceVolumesTableDataPerFluidSelection_api = {
            tableDataPerFluidSelection: [],
        };
        const combined = combine([
            makeQueryResult(emptyPerRealData, ["Unmapped FIPNUM 5"]),
            makeQueryResult(emptyPerRealData, ["Unmapped FIPNUM 6"]),
        ]);

        expect(combined.tablesData).toHaveLength(1);
        expect(combined.tablesData[0].tableName).toBe(SIMULATOR_KEY);
        expect(combined.warnings).toEqual([
            '(iter-0) - (iter-1), table "simgrid (simulator)", comparison: Unmapped FIPNUM 5',
            '(iter-0) - (iter-1), table "simgrid (simulator)", reference: Unmapped FIPNUM 6',
        ]);
    });
});

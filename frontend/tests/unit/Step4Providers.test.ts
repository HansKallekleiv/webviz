import { beforeEach, describe, expect, test, vi } from "vitest";

import * as Api from "@api";
import {
    InplaceVolumesProvider,
    makeRealizationTable,
} from "@framework/dataProviderFramework/dataProviders/implementations/InplaceVolumesProvider";
import { SummaryVectorProvider } from "@framework/dataProviderFramework/dataProviders/implementations/SummaryVectorProvider";
import { VisualizationKind } from "@framework/dataProviderFramework/dataProviders/visualizationKinds";
import { Representation } from "@framework/dataProviderFramework/settings/implementations/RepresentationSetting";
import { Setting } from "@framework/dataProviderFramework/settings/settingsDefinitions";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { DataKind, SummaryVectorRepresentation, type InplaceVolumesAddress } from "@framework/domain/DataAddress";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

vi.mock("@api", async (importOriginal) => {
    const original = await importOriginal<typeof Api>();
    return {
        ...original,
        getDeltaEnsembleRealizationsVectorDataOptions: vi.fn((options) => ({
            queryKey: ["delta-realizations", options],
        })),
        getDeltaEnsembleStatisticalVectorDataOptions: vi.fn((options) => ({
            queryKey: ["delta-statistics", options],
        })),
        getRealizationsVectorDataOptions: vi.fn((options) => ({ queryKey: ["regular-realizations", options] })),
        getStatisticalVectorDataOptions: vi.fn((options) => ({ queryKey: ["regular-statistics", options] })),
        postGetAggregatedPerRealizationInplaceTableDataOptions: vi.fn((options) => ({
            queryKey: ["inplace-realizations", options],
        })),
    };
});

vi.mock("@framework/utils/queryUtils", () => ({
    makeCacheBustingQueryParam: vi.fn(() => ({ zCacheBust: "fingerprint" })),
}));

const FIRST_UUID = "00000000-0000-4000-8000-000000000001";
const SECOND_UUID = "00000000-0000-4000-8000-000000000002";

describe("SummaryVectorProvider", () => {
    const first = new RegularEnsembleIdent(FIRST_UUID, "first");
    const second = new RegularEnsembleIdent(SECOND_UUID, "second");
    const delta = new DeltaEnsembleIdent(first, second);
    const provider = new SummaryVectorProvider();
    const fetchQuery = vi.fn();

    beforeEach(() => {
        fetchQuery.mockReset();
    });

    test("declares delta and time-series capabilities", () => {
        expect(provider.supportsEnsembleKinds).toEqual(["regular", "delta"]);
        expect(provider.compatibleVisualizationKinds).toEqual([VisualizationKind.TIME_SERIES]);
    });

    test.each([
        [first, Representation.REALIZATION, Api.Frequency_api.MONTHLY, "regular-realizations", SummaryVectorRepresentation.REALIZATIONS],
        [delta, Representation.REALIZATION, Api.Frequency_api.MONTHLY, "delta-realizations", SummaryVectorRepresentation.REALIZATIONS],
        [first, Representation.ENSEMBLE_STATISTICS, Api.Frequency_api.MONTHLY, "regular-statistics", SummaryVectorRepresentation.STATISTICS],
        [delta, Representation.FANCHART, Api.Frequency_api.MONTHLY, "delta-statistics", SummaryVectorRepresentation.FANCHART],
    ] as const)("selects %s %s endpoint", async (ensemble, representation, frequency, endpoint, addressRepresentation) => {
        fetchQuery.mockImplementation(async (options) =>
            String(options.queryKey[0]).includes("statistics")
                ? { realizations: [], timestampsUtcMs: [], valueObjects: [], unit: "Sm3", isRate: false }
                : [],
        );
        const settings = new Map<Setting, unknown>([
            [Setting.ENSEMBLE, ensemble],
            [Setting.REALIZATIONS, [1, 2]],
            [Setting.VECTOR_NAME, "FOPT"],
            [Setting.VECTOR_RESAMPLING_FREQUENCY, frequency],
            [Setting.REPRESENTATION, representation],
        ]);

        const result = await provider.fetchData({
            getSetting: (setting: Setting) => settings.get(setting),
            fetchQuery,
        } as never);

        expect(fetchQuery.mock.calls[0][0].queryKey[0]).toBe(endpoint);
        expect(result.address).toMatchObject({
            kind: DataKind.SUMMARY_VECTOR,
            ensemble,
            vectorName: "FOPT",
            frequency,
            representation: addressRepresentation,
        });
    });

    test("permits raw regular realizations but rejects raw delta data", async () => {
        fetchQuery.mockResolvedValue([]);
        const makeParams = (ensemble: RegularEnsembleIdent | DeltaEnsembleIdent) => ({
            getSetting: (setting: Setting) =>
                new Map<Setting, unknown>([
                    [Setting.ENSEMBLE, ensemble],
                    [Setting.REALIZATIONS, [1]],
                    [Setting.VECTOR_NAME, "FOPT"],
                    [Setting.VECTOR_RESAMPLING_FREQUENCY, null],
                    [Setting.REPRESENTATION, Representation.REALIZATION],
                ]).get(setting),
            fetchQuery,
        });

        await expect(provider.fetchData(makeParams(first) as never)).resolves.toBeDefined();
        await expect(provider.fetchData(makeParams(delta) as never)).rejects.toThrow(
            "Delta vector data requires a resampling frequency",
        );
    });
});

describe("InplaceVolumesProvider", () => {
    test("includes all catalogue fluid values in the request", async () => {
        const ensemble = new RegularEnsembleIdent(FIRST_UUID, "first");
        const provider = new InplaceVolumesProvider();
        const fetchQuery = vi.fn().mockResolvedValue({ tableDataPerFluidSelection: [] });
        const settings = new Map<Setting, unknown>([
            [Setting.ENSEMBLE, ensemble],
            [Setting.REALIZATIONS, [1, 2]],
            [Setting.GRID_NAME, "grid"],
            [Setting.INPLACE_RESULT, "STOIIP"],
            [Setting.ZONE, []],
            [Setting.REGION, []],
            [Setting.FACIES, []],
            [Setting.LICENSE, []],
        ]);

        await provider.fetchData({
            getSetting: (setting: Setting) => settings.get(setting),
            getSettingValueConstraints: () => [],
            getStoredData: () => [
                {
                    tableName: "grid",
                    resultNames: ["STOIIP"],
                    indicesWithValues: [{ indexColumn: "FLUID", values: ["gas", "oil", "water"] }],
                },
            ],
            getWorkbenchSession: () => ({
                getEnsembleSet: () => ({ getEnsemble: () => ({ getSensitivities: () => null }) }),
            }),
            fetchQuery,
        } as never);

        expect(fetchQuery.mock.calls[0][0].queryKey[1].body.indices_with_values).toContainEqual({
            indexColumn: "FLUID",
            values: ["gas", "oil", "water"],
        });
    });
});

describe("makeRealizationTable", () => {
    test("expands compressed selectors and preserves row alignment across fluid selections", () => {
        const ensemble = new RegularEnsembleIdent(FIRST_UUID, "first");
        const address: InplaceVolumesAddress = {
            kind: DataKind.INPLACE_VOLUMES,
            ensemble,
            gridName: "grid",
            resultName: "STOIIP",
            filters: { zone: ["A", "B"], region: [], facies: [], license: [] },
        };
        const response = {
            tableDataPerFluidSelection: [
                {
                    fluidSelection: "Oil",
                    selectorColumns: [
                        { columnName: "REAL", uniqueValues: [1, 2], indices: [0, 1] },
                        { columnName: "ZONE", uniqueValues: ["A", "B"], indices: [0, 1] },
                    ],
                    resultColumns: [{ columnName: "STOIIP", columnValues: [10, 20] }],
                },
                {
                    fluidSelection: "Gas",
                    selectorColumns: [
                        { columnName: "REAL", uniqueValues: [1], indices: [0] },
                        { columnName: "ZONE", uniqueValues: ["A"], indices: [0] },
                    ],
                    resultColumns: [{ columnName: "STOIIP", columnValues: [30] }],
                },
            ],
        };

        const table = makeRealizationTable(response, address);
        expect(table.keyColumns.realization).toEqual(new Int32Array([1, 2, 1]));
        expect(table.indexColumns.ZONE).toEqual(["A", "B", "A"]);
        expect(table.indexColumns.FLUID_SELECTION).toEqual(["Oil", "Oil", "Gas"]);
        expect(table.valueColumns[0].values).toEqual(new Float64Array([10, 20, 30]));
        expect(table.origin).toEqual({ ensemble, address });
    });
});
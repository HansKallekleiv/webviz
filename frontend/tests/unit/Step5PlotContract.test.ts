import { describe, expect, test } from "vitest";

import { Frequency_api, StatisticFunction_api } from "@api";
import {
    makeInplaceVolumesSeries,
    makeSummaryVectorHistorySeries,
    makeSummaryVectorObservationSeries,
    makeSummaryVectorSeries,
    PlotSeriesGroupKey,
} from "@framework/dataProviderFramework/visualization/plotTransformers";
import { VisualizationTarget } from "@framework/dataProviderFramework/visualization/VisualizationAssembler";
import { DataKind, SummaryVectorRepresentation, type InplaceVolumesAddress } from "@framework/domain/DataAddress";
import type { RealizationTable } from "@framework/domain/RealizationTable";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

const CASE_UUID = "00000000-0000-4000-8000-000000000001";

describe("plot visualization contract", () => {
    const ensemble = new RegularEnsembleIdent(CASE_UUID, "ensemble");

    test("exposes the plot target", () => {
        expect(VisualizationTarget.PLOT).toBe("plot");
    });

    test("normalizes realization vectors with point-aligned realization and timestamp identity", () => {
        const series = makeSummaryVectorSeries(
            {
                address: {
                    kind: DataKind.SUMMARY_VECTOR,
                    ensemble,
                    vectorName: "FOPT",
                    frequency: Frequency_api.MONTHLY,
                    representation: SummaryVectorRepresentation.REALIZATIONS,
                },
                realizations: [
                    {
                        realization: 7,
                        timestampsUtcMs: [1000, 2000],
                        values: [10, 20],
                        unit: "Sm3",
                        isRate: false,
                    },
                ],
            },
            "provider-a",
        );

        expect(series).toHaveLength(1);
        expect(series[0].groupKeys).toMatchObject({
            [PlotSeriesGroupKey.PROVIDER]: "provider-a",
            [PlotSeriesGroupKey.REALIZATION]: 7,
            [PlotSeriesGroupKey.VECTOR]: "FOPT",
        });
        expect(series[0].points).toEqual({ x: [1000, 2000], y: [10, 20] });
        expect(series[0].identity).toEqual([
            { realization: 7, timestampUtcMs: 1000 },
            { realization: 7, timestampUtcMs: 2000 },
        ]);
    });

    test("distinguishes fanchart lines from bands", () => {
        const series = makeSummaryVectorSeries(
            {
                address: {
                    kind: DataKind.SUMMARY_VECTOR,
                    ensemble,
                    vectorName: "FOPT",
                    frequency: Frequency_api.MONTHLY,
                    representation: SummaryVectorRepresentation.FANCHART,
                },
                statistics: {
                    realizations: [1, 2],
                    timestampsUtcMs: [1000],
                    valueObjects: [
                        { statisticFunction: StatisticFunction_api.MEAN, values: [10] },
                        { statisticFunction: StatisticFunction_api.P10, values: [12] },
                    ],
                    unit: "Sm3",
                    isRate: false,
                },
            },
            "provider-a",
        );

        expect(series.map((item) => item.role)).toEqual(["statistics-line", "statistics-band"]);
        expect(series.map((item) => item.groupKeys[PlotSeriesGroupKey.STATISTIC])).toEqual(["MEAN", "P10"]);
    });

    test("normalizes history and observations with timestamp identity", () => {
        const history = makeSummaryVectorHistorySeries(
            {
                ensemble,
                vectorName: "FOPT",
                history: { timestampsUtcMs: [1000], values: [8], unit: "Sm3", isRate: false },
            },
            "history",
        );
        const observations = makeSummaryVectorObservationSeries(
            {
                ensemble,
                vectorName: "FOPT",
                observations: [{ timestamp_utc_ms: 1000, value: 9, error: 0.5, label: "Observed" }],
            },
            "observations",
        );

        expect(history[0]).toMatchObject({ role: "history", identity: [{ timestampUtcMs: 1000 }] });
        expect(observations[0]).toMatchObject({ role: "observation", identity: [{ timestampUtcMs: 1000 }] });
    });

    test("partitions inplace rows by index tuple without losing row identity", () => {
        const address: InplaceVolumesAddress = {
            kind: DataKind.INPLACE_VOLUMES,
            ensemble,
            gridName: "grid",
            resultName: "STOIIP",
            filters: { zone: [], region: [], facies: [], license: [] },
        };
        const table: RealizationTable = {
            keyColumns: { realization: new Int32Array([3, 1, 2]) },
            indexColumns: { ZONE: ["A", "B", "A"], SENSITIVITY_NAME: ["low", null, "low"] },
            valueColumns: [{ name: "STOIIP", unit: "Sm3", values: new Float64Array([30, 10, 20]) }],
            origin: { ensemble, address },
        };

        const series = makeInplaceVolumesSeries(table, "volumes");

        expect(series).toHaveLength(2);
        expect(series[0].groupKeys).toMatchObject({ ZONE: "A", SENSITIVITY_NAME: "low", result: "STOIIP" });
        expect(series[0].points).toEqual({ x: [3, 2], y: [30, 20] });
        expect(series[0].identity).toEqual([
            { realization: 3, timestampUtcMs: undefined, indexValues: { SENSITIVITY_NAME: "low", ZONE: "A" } },
            { realization: 2, timestampUtcMs: undefined, indexValues: { SENSITIVITY_NAME: "low", ZONE: "A" } },
        ]);
        expect(series[1].groupKeys).not.toHaveProperty("SENSITIVITY_NAME");
        expect(series[1].identity?.[0]?.indexValues?.SENSITIVITY_NAME).toBeNull();
    });
});
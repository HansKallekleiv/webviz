import { describe, expect, test } from "vitest";

import { Frequency_api, StatisticFunction_api } from "@api";
import { VisualizationKind } from "@framework/dataProviderFramework/dataProviders/visualizationKinds";
import { getCompatibleVisualizationKinds } from "@framework/dataProviderFramework/groups/implementations/PlotView";
import {
    allocatePlotColors,
    collectPlotGroup,
    makePlotFacets,
} from "@framework/dataProviderFramework/visualization/plotCollector";
import {
    getSeriesPointIdentity,
    makePlotlyFigure,
} from "@framework/dataProviderFramework/visualization/plotlyFigure";
import { makePlotStatisticsRows } from "@framework/dataProviderFramework/visualization/PlotStatisticsTable";
import {
    makeInplaceVolumesSeries,
    makeSummaryVectorHistorySeries,
    makeSummaryVectorObservationSeries,
    makeSummaryVectorSeries,
    PlotSeriesGroupKey,
} from "@framework/dataProviderFramework/visualization/plotTransformers";
import { PlotDimension, type SeriesVisualization } from "@framework/dataProviderFramework/visualization/plotTypes";
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

    test("intersects visualization kinds across providers", () => {
        const provider = (kinds: readonly VisualizationKind[]) =>
            ({ getCompatibleVisualizationKinds: () => kinds }) as never;

        expect(
            getCompatibleVisualizationKinds([
                provider([VisualizationKind.TIME_SERIES, VisualizationKind.BAR]),
                provider([VisualizationKind.BAR, VisualizationKind.TABLE]),
            ]),
        ).toEqual([VisualizationKind.BAR]);
        expect(
            getCompatibleVisualizationKinds([
                provider([VisualizationKind.TIME_SERIES]),
                provider([VisualizationKind.HISTOGRAM]),
            ]),
        ).toEqual([]);
    });

    test("allocates stable colors from sorted domains and honors ensemble colors", () => {
        const makeSeries = (ensembleName: string): SeriesVisualization => ({
            groupKeys: { ensemble: ensembleName, provider: `provider-${ensembleName}` },
            role: "primary",
            points: { x: [], y: [] },
        });
        const firstOrder = [makeSeries("B"), makeSeries("A")];
        const secondOrder = [...firstOrder].reverse();

        expect(allocatePlotColors(firstOrder, PlotDimension.PROVIDER, ["red", "blue"])).toEqual(
            allocatePlotColors(secondOrder, PlotDimension.PROVIDER, ["red", "blue"]),
        );
        expect(allocatePlotColors(firstOrder, PlotDimension.ENSEMBLE, ["red"], { A: "green" })).toEqual([
            { key: "A", color: "green" },
            { key: "B", color: "red" },
        ]);
    });

    test("builds deterministic facets and grouped volume statistics", () => {
        const series: SeriesVisualization[] = [
            { groupKeys: { ZONE: "B" }, role: "primary", points: { x: [1], y: [20] } },
            { groupKeys: { ZONE: "A" }, role: "primary", points: { x: [1], y: [10] } },
        ];
        const address: InplaceVolumesAddress = {
            kind: DataKind.INPLACE_VOLUMES,
            ensemble,
            gridName: "grid",
            resultName: "STOIIP",
            filters: { zone: [], region: [], facies: [], license: [] },
        };
        const table: RealizationTable = {
            keyColumns: { realization: new Int32Array([1, 2]) },
            indexColumns: { ZONE: ["A", "B"] },
            valueColumns: [{ name: "STOIIP", unit: "Sm3", values: new Float64Array([10, 20]) }],
            origin: { ensemble, address },
        };

        expect(makePlotFacets(series, PlotDimension.ZONE).map((facet) => facet.key)).toEqual(["A", "B"]);
        const product = collectPlotGroup(
            { series, realizationTables: [table] },
            {
                visualizationKind: VisualizationKind.HISTOGRAM,
                colorBy: PlotDimension.ZONE,
                subplotBy: PlotDimension.ZONE,
                categoricalPalette: ["red", "blue"],
            },
        );
        expect(product.legendKeys).toEqual(["A", "B"]);
        expect(product.statisticsTables[0].groups.map((group) => group.valueStatistics.STOIIP.mean)).toEqual([10, 20]);
    });

    test("assembles subplot traces with deduplicated legends and identity highlighting", () => {
        const series: SeriesVisualization[] = [
            {
                groupKeys: { ensemble: "A", ZONE: "A" },
                role: "primary",
                points: { x: [1], y: [10] },
                identity: [{ realization: 1 }],
            },
            {
                groupKeys: { ensemble: "A", ZONE: "B" },
                role: "primary",
                points: { x: [2], y: [20] },
                identity: [{ realization: 2 }],
            },
        ];
        const product = collectPlotGroup(
            { series, realizationTables: [] },
            {
                visualizationKind: VisualizationKind.BAR,
                colorBy: PlotDimension.ENSEMBLE,
                subplotBy: PlotDimension.ZONE,
                categoricalPalette: ["red"],
            },
        );

        const figure = makePlotlyFigure(product, { realization: 2, timestampUtcMs: null });
        expect(figure.data).toHaveLength(2);
        expect(figure.data[0]).toMatchObject({ xaxis: "x", showlegend: true, selectedpoints: [] });
        expect(figure.data[1]).toMatchObject({ xaxis: "x2", showlegend: false, selectedpoints: [0] });
        expect(getSeriesPointIdentity(figure.identityMaps, 1, 0)).toEqual({ realization: 2 });
    });

    test("assembles client-side statistics as a table trace", () => {
        const address: InplaceVolumesAddress = {
            kind: DataKind.INPLACE_VOLUMES,
            ensemble,
            gridName: "grid",
            resultName: "STOIIP",
            filters: { zone: [], region: [], facies: [], license: [] },
        };
        const table: RealizationTable = {
            keyColumns: { realization: new Int32Array([1]) },
            indexColumns: { ZONE: ["A"] },
            valueColumns: [{ name: "STOIIP", unit: "Sm3", values: new Float64Array([10]) }],
            origin: { ensemble, address },
        };
        const product = collectPlotGroup(
            { series: [], realizationTables: [table] },
            {
                visualizationKind: VisualizationKind.TABLE,
                colorBy: PlotDimension.ZONE,
                subplotBy: PlotDimension.NONE,
                categoricalPalette: ["red"],
            },
        );

        const figure = makePlotlyFigure(product);
        expect(figure.data[0]).toMatchObject({ type: "table", header: { values: expect.arrayContaining(["STOIIP mean"]) } });
        expect(makePlotStatisticsRows(product)).toMatchObject([{ group: "ZONE: A", result: "STOIIP", mean: 10 }]);
    });
});
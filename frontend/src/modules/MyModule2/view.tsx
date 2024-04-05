import React from "react";

import { WellBoreCompletion_api } from "@api";
import {
    InternalLayerOptions,
    IntersectionReferenceSystem,
    Perforation,
    SchematicData,
    SurfaceLine,
    getPicksData,
    getSeismicInfo,
    getSeismicOptions,
    transformFormationData,
} from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useSeismicFenceDataQuery } from "@modules/SeismicIntersection/queryHooks";
import { makeTrajectoryXyzPointsFromWellboreTrajectory } from "@modules/SeismicIntersection/utils/esvIntersectionDataConversion";
import { useWellTrajectoriesQuery } from "@modules/_shared/WellBore";
import {
    useWellboreCompletionsQuery,
    useWellborePicksAndStratigraphicUnitsQuery,
} from "@modules/_shared/WellBore/queryHooks";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";
import {
    EsvIntersectionReadoutEvent,
    LayerItem,
    LayerType,
} from "@modules/_shared/components/EsvIntersection/esvIntersection";
import { ReadoutItem } from "@modules/_shared/components/EsvIntersection/interaction/types";
import { createEsvWellborePicksAndStratigraphicUnits } from "@modules/_shared/components/EsvIntersection/utils/dataConversion";
import { getColorFromLayerData } from "@modules/_shared/components/EsvIntersection/utils/intersectionConversion";
import {
    getAdditionalInformationFromReadoutItem,
    getLabelFromLayerData,
} from "@modules/_shared/components/EsvIntersection/utils/readoutItemUtils";
import { makeSurfaceStatisticalFanchartFromRealizationSurfaces } from "@modules/_shared/components/EsvIntersection/utils/surfaceStatisticalFancharts";

import { isEqual } from "lodash";

import { getPolyLineIntersection } from "./data/data";
import { useSampleSurfaceInPointsQueries } from "./queryHooks";
import { SeismicDataType, State } from "./state";
import {
    createSeismicSliceImageDataArrayFromFenceData,
    createSeismicSliceImageYAxisValuesArrayFromFenceData,
} from "./utils/esvIntersectionDataConversion";
import { SeismicSliceImageOptions, useGenerateSeismicSliceImageData } from "./utils/esvIntersectionHooks";

export const View = (props: ModuleViewProps<State>) => {
    const statusWriter = useViewStatusWriter(props.viewContext);

    const ensembleIdent = props.viewContext.useStoreValue("ensembleIdent");
    const realizations = props.viewContext.useStoreValue("realizations");
    const wellboreHeader = props.viewContext.useStoreValue("wellboreHeader");
    const surfaceAttribute = props.viewContext.useStoreValue("surfaceAttribute");
    const surfaceNames = props.viewContext.useStoreValue("surfaceNames");
    const stratigraphyColorMap = props.viewContext.useStoreValue("stratigraphyColorMap");
    const seismicAttribute = props.viewContext.useStoreValue("seismicAttribute");
    const seismicTime = props.viewContext.useStoreValue("seismicTimestamp");
    const seismicDataType = props.viewContext.useStoreValue("seismicDataType");

    const visibleLayers = props.viewContext.useStoreValue("visibleLayers");
    const visibleStatisticCurves = props.viewContext.useStoreValue("visibleStatisticCurves");

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const seismicColors = props.workbenchSettings
        .useDiscreteColorScale({
            gradientType: ColorScaleGradientType.Diverging,
        })
        .getColorPalette()
        .getColors();

    const [ris, setRis] = React.useState<IntersectionReferenceSystem | null>(null);
    const [prevTrajectoryPoint, setPrevTrajectoryPoint] = React.useState<number[][]>([]);
    const [polylineIntersectionLayer, setPolylineIntersectionLayer] = React.useState<LayerItem | null>(null);
    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);

    const wellboreTrajectoriesQuery = useWellTrajectoriesQuery(
        wellboreHeader ? [wellboreHeader.wellbore_uuid] : undefined
    );
    if (wellboreTrajectoriesQuery.isError) {
        statusWriter.addError("Error loading well trajectories");
    }

    const wellboreCompletionsQuery = useWellboreCompletionsQuery(
        wellboreHeader?.wellbore_uuid,
        wellboreHeader !== undefined
    );

    const wellborePicksAndStratigraphicUnitsQuery = useWellborePicksAndStratigraphicUnitsQuery(
        ensembleIdent?.getCaseUuid(),
        wellboreHeader?.wellbore_uuid,
        true
    );

    if (wellborePicksAndStratigraphicUnitsQuery.isError) {
        statusWriter.addError("Error loading wellbore picks and stratigraphic units");
    }

    let trajectoryXyzPoints: number[][] = [];

    if (wellboreTrajectoriesQuery.data && wellboreTrajectoriesQuery.data.length !== 0) {
        trajectoryXyzPoints = makeTrajectoryXyzPointsFromWellboreTrajectory(wellboreTrajectoriesQuery.data[0]);
        if (!isEqual(trajectoryXyzPoints, prevTrajectoryPoint)) {
            setPrevTrajectoryPoint(trajectoryXyzPoints);
            const referenceSystem = new IntersectionReferenceSystem(trajectoryXyzPoints);
            referenceSystem.offset = wellboreTrajectoriesQuery.data[0].md_arr[0]; // Offset should be md at start of path
            setRis(referenceSystem);
        }
    }

    const xPoints = trajectoryXyzPoints.map((coord) => coord[0]) ?? [];
    const yPoints = trajectoryXyzPoints.map((coord) => coord[1]) ?? [];

    let cumLength: number[] = [];

    if (trajectoryXyzPoints) {
        cumLength = IntersectionReferenceSystem.toDisplacement(trajectoryXyzPoints, 0).map((coord) => coord[0]);
    }

    const sampleSurfaceInPointsQueries = useSampleSurfaceInPointsQueries(
        ensembleIdent?.getCaseUuid() ?? "",
        ensembleIdent?.getEnsembleName() ?? "",
        surfaceNames ?? [],
        surfaceAttribute ?? "",
        realizations ?? [],
        xPoints,
        yPoints,
        true
    );

    statusWriter.setLoading(wellboreTrajectoriesQuery.isFetching || sampleSurfaceInPointsQueries.isFetching);

    let errorString = "";
    if (wellboreTrajectoriesQuery.isError) {
        errorString += "Error loading well trajectories";
    }

    if (errorString !== "") {
        statusWriter.addError(errorString);
    }

    // Get seismic fence data from polyline
    const seismicFenceDataQuery = useSeismicFenceDataQuery(
        ensembleIdent?.getCaseUuid() ?? null,
        ensembleIdent?.getEnsembleName() ?? null,
        realizations[0] ?? null,
        seismicAttribute ?? null,
        seismicTime ?? null,
        seismicDataType === SeismicDataType.OBSERVED ?? null,
        {
            x_points: trajectoryXyzPoints.map((coord) => coord[0]),
            y_points: trajectoryXyzPoints.map((coord) => coord[1]),
        },
        !!(
            ensembleIdent &&
            realizations.length > 0 &&
            seismicAttribute &&
            seismicTime &&
            seismicDataType &&
            trajectoryXyzPoints
        )
    );
    if (seismicFenceDataQuery.isError) {
        statusWriter.addError("Error loading seismic fence data");
    }

    const [generateSeismicSliceImageOptions, setGenerateSeismicSliceImageOptions] =
        React.useState<SeismicSliceImageOptions | null>(null);
    const generatedSeismicSliceImageData = useGenerateSeismicSliceImageData(generateSeismicSliceImageOptions);

    React.useEffect(() => {
        const promises = [getPolyLineIntersection()];
        Promise.all(promises).then((values) => {
            const [polylineIntersection] = values;

            setPolylineIntersectionLayer({
                id: "polyline-intersection",
                type: LayerType.POLYLINE_INTERSECTION,
                hoverable: true,
                options: {
                    data: polylineIntersection,
                    colorScale,
                },
            });
        });
    }, [colorScale]);

    const surfaceStatisticsFancharts = sampleSurfaceInPointsQueries.data.map((surface) => {
        const fanchart = makeSurfaceStatisticalFanchartFromRealizationSurfaces(
            surface.realizationPoints.map((el) => el.sampled_values),
            cumLength,
            surface.surfaceName,
            stratigraphyColorMap,
            visibleStatisticCurves
        );
        return fanchart;
    });

    const layers: LayerItem[] = [
        {
            id: "wellborepath",
            type: LayerType.WELLBORE_PATH,
            hoverable: true,
            options: {
                order: 3,
                stroke: "red",
                strokeWidth: "2px",
                referenceSystem: ris ?? undefined,
            },
        },
        {
            id: "geomodel",
            type: LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS,
            hoverable: true,
            options: {
                order: 4,
                data: {
                    fancharts: surfaceStatisticsFancharts,
                },
            },
        },
        {
            id: "geomodel-labels",
            type: LayerType.GEOMODEL_LABELS,
            options: {
                order: 5,
                data: {
                    lines: surfaceStatisticsFancharts.map((fanchart) => {
                        const line: SurfaceLine = {
                            color: fanchart.color ?? "black",
                            label: fanchart.label ?? "Surface",
                            data: fanchart.data.mean,
                        };
                        return line;
                    }),
                    areas: [],
                },
            },
        },
    ];

    if (polylineIntersectionLayer) {
        layers.push(polylineIntersectionLayer);
    }

    if (seismicFenceDataQuery.data) {
        const newExtendedWellboreTrajectoryXyProjection: number[][] = trajectoryXyzPoints
            ? IntersectionReferenceSystem.toDisplacement(trajectoryXyzPoints, ris?.offset)
            : [];

        const newSeismicImageDataArray = createSeismicSliceImageDataArrayFromFenceData(seismicFenceDataQuery.data);
        const newSeismicImageYAxisValues = createSeismicSliceImageYAxisValuesArrayFromFenceData(
            seismicFenceDataQuery.data
        );

        const newGenerateSeismicSliceImageOptions: SeismicSliceImageOptions = {
            dataValues: newSeismicImageDataArray,
            yAxisValues: newSeismicImageYAxisValues,
            trajectoryXyPoints: newExtendedWellboreTrajectoryXyProjection,
            colormap: seismicColors,
            extension: 0,
        };

        if (!isEqual(generateSeismicSliceImageOptions, newGenerateSeismicSliceImageOptions)) {
            setGenerateSeismicSliceImageOptions(newGenerateSeismicSliceImageOptions);
        }
    }

    if (wellboreHeader && wellboreTrajectoriesQuery.data) {
        const tvdStart = wellboreTrajectoriesQuery.data[0].tvd_msl_arr[0] - wellboreTrajectoriesQuery.data[0].md_arr[0];
        if (tvdStart !== undefined) {
            layers.push({
                id: "sea-and-rkb",
                type: LayerType.REFERENCE_LINE,
                options: {
                    data: [
                        {
                            text: wellboreHeader.depth_reference_point,
                            lineType: "dashed",
                            color: "black",
                            depth: tvdStart,
                        },
                        {
                            text: wellboreHeader.depth_reference_datum,
                            lineType: wellboreHeader.depth_reference_datum === "MSL" ? "wavy" : "solid",
                            color: wellboreHeader.depth_reference_datum === "MSL" ? "blue" : "brown",
                            depth: tvdStart + wellboreHeader.depth_reference_elevation,
                        },
                    ],
                },
            });
        }
    }

    if (wellboreCompletionsQuery.data) {
        const internalLayerIds: InternalLayerOptions = {
            holeLayerId: "hole-id",
            casingLayerId: "casing-id",
            completionLayerId: "completion-id",
            cementLayerId: "cement-id",
            pAndALayerId: "pAndA-id",
            perforationLayerId: "perforation-id",
        };

        layers.push({
            id: "schematic",
            type: LayerType.SCHEMATIC,
            hoverable: true,
            options: {
                order: 5,
                data: makeSchematicsFromWellCompletions(wellboreCompletionsQuery.data),
                referenceSystem: ris ?? undefined,
                internalLayerOptions: internalLayerIds,
            },
        });
    }

    if (wellborePicksAndStratigraphicUnitsQuery.data) {
        const { wellborePicks, stratigraphicUnits } = createEsvWellborePicksAndStratigraphicUnits(
            wellborePicksAndStratigraphicUnitsQuery.data
        );
        const picksData = transformFormationData(wellborePicks, stratigraphicUnits);
        layers.push({
            id: "callout",
            type: LayerType.CALLOUT_CANVAS,
            hoverable: true,
            options: {
                order: 100,
                data: getPicksData(picksData),
                referenceSystem: ris ?? undefined,
                minFontSize: 12,
                maxFontSize: 16,
            },
        });
    }

    if (
        generatedSeismicSliceImageData &&
        generatedSeismicSliceImageData.status === "success" &&
        generatedSeismicSliceImageData.image &&
        generatedSeismicSliceImageData.synchedOptions
    ) {
        const info = getSeismicInfo(
            {
                datapoints: generatedSeismicSliceImageData.synchedOptions.dataValues,
                yAxisValues: generatedSeismicSliceImageData.synchedOptions.yAxisValues,
            },
            generatedSeismicSliceImageData.synchedOptions.trajectoryXyPoints
        );
        if (info) {
            // Adjust x axis offset to account for curtain
            info.minX = info.minX - 0;
            info.maxX = info.maxX - 0;
        }
        layers.push({
            id: "seismic",
            type: LayerType.SEISMIC_CANVAS,
            hoverable: true,
            options: {
                data: {
                    image: generatedSeismicSliceImageData.image,
                    options: getSeismicOptions(info),
                },
            },
        });
    }

    const handleReadoutItemsChange = React.useCallback((event: EsvIntersectionReadoutEvent) => {
        setReadoutItems(event.readoutItems);
    }, []);

    return (
        <div className="h-full w-full relative flex flex-col justify-center items-center">
            <EsvIntersection
                showGrid={visibleLayers.includes("grid")}
                showAxes
                showAxesLabels={visibleLayers.includes("axis-labels")}
                axesOptions={{
                    xLabel: "X",
                    yLabel: "Y",
                    unitOfMeasure: "m",
                }}
                layers={layers.filter((layer) => {
                    return (
                        (layer.id === "wellborepath" && visibleLayers.includes("wellborepath")) ||
                        (layer.id === "geomodel" && visibleLayers.includes("geomodel")) ||
                        (layer.id === "geomodel-labels" && visibleLayers.includes("geomodel-labels")) ||
                        (layer.id === "seismic" && visibleLayers.includes("seismic")) ||
                        (layer.id === "schematic" && visibleLayers.includes("schematic")) ||
                        (layer.id === "sea-and-rkb" && visibleLayers.includes("sea-and-rkb")) ||
                        (layer.id === "callout" && visibleLayers.includes("picks")) ||
                        (layer.id === "polyline-intersection" && visibleLayers.includes("polyline-intersection"))
                    );
                })}
                intersectionReferenceSystem={ris ?? undefined}
                bounds={{
                    x: [10, 1000],
                    y: [0, 3000],
                }}
                viewport={[1000, 1650, 6000]}
                onReadout={handleReadoutItemsChange}
            />
            <div className="absolute inset-0">
                <div
                    className="relative inset-0 bg-slate-50 rounded p-2 w-64 bg-opacity-70 pointer-events-none flex flex-col gap-2"
                    style={{ zIndex: 200 }}
                >
                    {readoutItems.map((item, index) => {
                        if (index > 3) {
                            return null;
                        }
                        return (
                            <div key={index} className="flex flex-row items-center gap-2">
                                <div
                                    style={{ backgroundColor: getColorFromLayerData(item.layer, item.index) }}
                                    className="w-4 h-4 mr-2 rounded-full"
                                />
                                <div className="flex flex-col gap-1 text-sm">
                                    <div className="font-bold">{getLabelFromLayerData(item)}</div>
                                    <div className="text-sm">
                                        {getAdditionalInformationFromReadoutItem(item).map((el) => (
                                            <div>{el}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {readoutItems.length > 4 && (
                        <div className="text-sm font-bold">+ {readoutItems.length - 4} more</div>
                    )}
                </div>
            </div>
        </div>
    );
};

View.displayName = "View";

function makeSchematicsFromWellCompletions(completions: WellBoreCompletion_api[]): SchematicData {
    const perforations: Perforation[] = [];
    for (const [index, completion] of completions.entries()) {
        if (completion.completion_type === "perforation") {
            perforations.push({
                kind: "perforation",
                subKind: "Perforation",
                id: `perforation-${index}`,
                start: completion.top_depth_md,
                end: completion.base_depth_md,
                isOpen: completion.completion_open_flag,
            });
        }
    }

    return {
        holeSizes: [{ kind: "hole", id: "hole-01", start: 0, end: Infinity, diameter: 5 }],
        cements: [],
        casings: [],
        completion: [],
        pAndA: [],
        perforations,
        symbols: {},
    };
}

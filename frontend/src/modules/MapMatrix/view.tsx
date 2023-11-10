import React from "react";

import { SurfaceDataPng_api } from "@api";
import { View } from "@deck.gl/core/typed";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { SyncedSubsurfaceViewer } from "@modules/SubsurfaceMap/components/SyncedSubsurfaceViewer";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { SurfaceAddressFactory } from "@modules/_shared/Surface";
// import { shouldUpdateViewPortBounds } from "@modules/_shared/Surface/subsurfaceMapUtils";
import { ViewportType, ViewsType } from "@webviz/subsurface-viewer";
import { ViewFooter } from "@webviz/subsurface-viewer/dist/components/ViewFooter";

import { isEqual } from "lodash";

import { isoStringToDateOrIntervalLabel } from "./_utils/isoString";
import { StatisticFunctionToStringMapping } from "./components/aggregationSelect";
import { IndexedSurfaceDatas, useSurfaceDataSetQueryByAddress } from "./hooks/useSurfaceDataAsPngQuery";
import { State } from "./state";
import { EnsembleStageType, SurfaceSpecification } from "./types";

export function view({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const [prevSurfaceDataSetQueryByAddress, setPrevSurfaceDataSetQueryByAddress] =
        React.useState<IndexedSurfaceDatas | null>(null);
    const statusWriter = useViewStatusWriter(moduleContext);

    const surfaceSpecifications = moduleContext.useStoreValue("surfaceSpecifications");
    const surfaceAddresses: SurfaceAddress[] = [];
    surfaceSpecifications.forEach((surface) => {
        if (surface.ensembleIdent && surface.surfaceName && surface.surfaceAttribute) {
            const factory = new SurfaceAddressFactory(
                surface.ensembleIdent?.getCaseUuid(),
                surface.ensembleIdent?.getEnsembleName(),
                surface.surfaceName,
                surface.surfaceAttribute,
                surface.surfaceTimeOrInterval
            );
            if (surface.ensembleStage === EnsembleStageType.Realization && surface.realizationNum !== null) {
                const surfaceAddress = factory.createRealizationAddress(surface.realizationNum);
                surfaceAddresses.push(surfaceAddress);
            }
            if (surface.ensembleStage === EnsembleStageType.Statistics) {
                const surfaceAddress = factory.createStatisticalAddress(surface.statisticFunction);
                surfaceAddresses.push(surfaceAddress);
            }
        }
    });

    const surfaceDataSetQueryByAddress = useSurfaceDataSetQueryByAddress(surfaceAddresses);
    let surfaceDataSet: Array<{
        index: number;
        surfaceData: SurfaceDataPng_api | null;
    }> = [];
    if (
        !surfaceDataSetQueryByAddress.isFetching &&
        !isEqual(prevSurfaceDataSetQueryByAddress, surfaceDataSetQueryByAddress)
    ) {
        setPrevSurfaceDataSetQueryByAddress(surfaceDataSetQueryByAddress);
        surfaceDataSet = surfaceDataSetQueryByAddress.data;
    } else if (prevSurfaceDataSetQueryByAddress) {
        surfaceDataSet = prevSurfaceDataSetQueryByAddress.data;
    }
    statusWriter.setLoading(surfaceDataSetQueryByAddress.isFetching);

    const views: ViewsType = makeEmptySurfaceViews(surfaceDataSet.length ?? 1);
    const viewAnnotations: JSX.Element[] = [];
    const layers: Record<string, unknown>[] = [
        {
            "@@type": "Axes2DLayer",
            id: "axes-layer2D",
            marginH: 80,
            marginV: 30,
            isLeftRuler: true,
            isRightRuler: false,
            isBottomRuler: false,
            isTopRuler: true,
            backgroundColor: [255, 255, 255, 255],
        },
    ];

    surfaceDataSet.forEach((surface, index) => {
        const colorMin = surfaceSpecifications[index].colorMin ?? null;
        const colorMax = surfaceSpecifications[index].colorMax ?? null;
        const valueMin = surface?.surfaceData?.val_min ?? 0;
        const valueMax = surface?.surfaceData?.val_max ?? 0;
        if (surface.surfaceData) {
            const newBounds: [number, number, number, number] = [
                surface.surfaceData.x_min,
                surface.surfaceData.y_min,
                surface.surfaceData.x_max,
                surface.surfaceData.y_max,
            ];
            // Will cause an infite loop if bounds are varying between surfaces
            // if (shouldUpdateViewPortBounds(viewportBounds, newBounds)) {
            //     setviewPortBounds(newBounds);
            // }
            if (!viewportBounds) {
                setviewPortBounds(newBounds);
            }

            layers.push(
                makeSurfaceImageLayer(`surface-${index}`, surface.surfaceData, valueMin, valueMax, colorMin, colorMax)
            );
            views.viewports[index] = {
                id: `${index}view`,
                show3D: false,
                isSync: true,
                layerIds: ["axes-layer2D", `surface-${index}`],
                name: `Surface ${index}`,
            };
        }
        viewAnnotations.push(
            makeViewAnnotation(
                `${index}view`,
                surfaceSpecifications[index],
                colorMin || valueMin,
                colorMax || valueMax,
                "Physics"
            )
        );
    });

    return (
        <div className="relative w-full h-full flex flex-col">
            <div className="z-1">
                <SyncedSubsurfaceViewer
                    id={"test"}
                    layers={layers}
                    views={views}
                    bounds={viewportBounds || undefined}
                    workbenchServices={workbenchServices}
                    moduleContext={moduleContext}
                >
                    {viewAnnotations}
                </SyncedSubsurfaceViewer>
            </div>
        </div>
    );
}
function makeViewAnnotation(
    id: string,
    surfaceSpecification: SurfaceSpecification,
    colorMin: number,
    colorMax: number,
    colorName: string
): JSX.Element {
    return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        /* @ts-expect-error */
        <View key={id} id={id}>
            <>
                <ContinuousLegend
                    min={colorMin}
                    max={colorMax}
                    colorName={colorName}
                    cssLegendStyles={{ top: "20", right: "0", backgroundColor: "transparent" }}
                    legendScaleSize={0.1}
                    legendFontSize={30}
                />
                <ViewFooter>
                    {surfaceSpecification ? (
                        <div className="flex" style={{ bottom: 10 }}>
                            <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                {surfaceSpecification.surfaceName}
                            </div>
                            <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                {surfaceSpecification.surfaceAttribute}
                            </div>
                            {surfaceSpecification.surfaceTimeOrInterval && (
                                <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                    {isoStringToDateOrIntervalLabel(surfaceSpecification.surfaceTimeOrInterval)}
                                </div>
                            )}
                            {surfaceSpecification.ensembleStage === EnsembleStageType.Realization && (
                                <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                    {`Real: ${surfaceSpecification.realizationNum}`}
                                </div>
                            )}
                            {surfaceSpecification.ensembleStage === EnsembleStageType.Statistics && (
                                <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                    {`${StatisticFunctionToStringMapping[surfaceSpecification.statisticFunction]}`}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex">
                            <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                No surface found
                            </div>
                        </div>
                    )}
                </ViewFooter>
            </>
        </View>
    );
}

function makeSurfaceImageLayer(
    id: string,
    surfaceData: SurfaceDataPng_api,
    valueMin: number | null,
    valueMax: number | null,
    colorMin: number | null,
    colorMax: number | null
): Record<string, unknown> {
    return {
        "@@type": "ColormapLayer",
        id: id,
        image: `data:image/png;base64,${surfaceData.base64_encoded_image}`,
        bounds: [
            surfaceData.x_min_surf_orient,
            surfaceData.y_min_surf_orient,
            surfaceData.x_max_surf_orient,
            surfaceData.y_max_surf_orient,
        ],
        rotDeg: surfaceData.rot_deg,
        valueRange: [valueMin, valueMax],
        colorMapRange: [colorMin, colorMax],
    };
}

function makeEmptySurfaceViews(numSubplots: number): ViewsType {
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);
    const viewPorts: ViewportType[] = [];
    for (let index = 0; index < numSubplots; index++) {
        viewPorts.push({
            id: `${index}view`,
            show3D: false,
            isSync: true,
            layerIds: [`surface-${index}`],
            name: `Surface ${index}`,
        });
    }
    return { layout: [numRows, numColumns], showLabel: true, viewports: viewPorts };
}

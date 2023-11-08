import React from "react";

import { SurfaceDataPng_api } from "@api";
import { View } from "@deck.gl/core/typed";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { SyncedSubsurfaceViewer } from "@modules/SubsurfaceMap/components/SyncedSubsurfaceViewer";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { ViewportType, ViewsType } from "@webviz/subsurface-viewer";
import { ViewFooter } from "@webviz/subsurface-viewer/dist/components/ViewFooter";

import "animate.css";
import { includes, isEqual } from "lodash";

import { isoStringToDateOrIntervalLabel } from "./_utils/isoString";
import { IndexedSurfaceDatas, useSurfaceDataSetQueryByAddress } from "./hooks/useSurfaceDataAsPngQuery";
import { State } from "./state";

export function view({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const [prevSurfaceDataSetQueryByAddress, setPrevSurfaceDataSetQueryByAddress] =
        React.useState<IndexedSurfaceDatas | null>(null);

    const surfaceAddresses = moduleContext.useStoreValue("surfaceAddresses");

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

    const numSubplots = surfaceDataSet.length ?? 1;

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

    const views: ViewsType = { layout: [numRows, numColumns], showLabel: true, viewports: viewPorts };
    const layers: Record<string, unknown>[] = [];
    const viewAnnotations: JSX.Element[] = [];
    let bounds: [number, number, number, number] | null = null;

    surfaceDataSet.forEach((surface, index) => {
        if (surface.surfaceData) {
            if (!bounds) {
                bounds = [
                    surface.surfaceData.x_min,
                    surface.surfaceData.y_min,
                    surface.surfaceData.x_max,
                    surface.surfaceData.y_max,
                ];
            }
            layers.push(makeSurfaceImageLayer(`surface-${index}`, surface.surfaceData));
            views.viewports[index] = {
                id: `${index}view`,
                show3D: false,
                isSync: true,
                layerIds: [`surface-${index}`],
                name: `Surface ${index}`,
            };
        }
        viewAnnotations.push(
            makeViewAnnotation(
                `${index}view`,
                surface?.surfaceData ? surfaceAddresses[index] : null,
                surface?.surfaceData?.val_min || 0,
                surface?.surfaceData?.val_max || 0,
                "Physics"
            )
        );
    });

    return (
        <div className="relative w-full h-full flex flex-col">
            <div className="z-1 animate__animated animate__flash">
                <SyncedSubsurfaceViewer
                    id={"test"}
                    layers={layers}
                    views={views}
                    bounds={bounds || undefined}
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
    surfaceAddress: SurfaceAddress | null,
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
                    cssLegendStyles={{ top: "0", right: "0" }}
                    legendScaleSize={0.1}
                    legendFontSize={30}
                />
                <ViewFooter>
                    {surfaceAddress ? (
                        <div className="flex">
                            <div className=" m-0 bg-transparent animate__animated animate__flash  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                {surfaceAddress.name}
                            </div>
                            <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                {surfaceAddress.attribute}
                            </div>
                            {surfaceAddress.isoDateOrInterval && (
                                <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                    {isoStringToDateOrIntervalLabel(surfaceAddress.isoDateOrInterval)}
                                </div>
                            )}
                            {surfaceAddress.addressType === "realization" && (
                                <div className=" m-0 bg-transparent  border border-gray-300 p-1  max-w-sm text-gray-800 text-sm">
                                    {`Real: ${surfaceAddress.realizationNum}`}
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

function makeSurfaceImageLayer(id: string, surfaceData: SurfaceDataPng_api): Record<string, unknown> {
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
        valueRange: [surfaceData.val_min, surfaceData.val_max],
    };
}

import React from "react";

import { SurfaceDataPng_api } from "@api";
import { View } from "@deck.gl/core/typed";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { SyncedSubsurfaceViewer } from "@modules/SubsurfaceMap/components/SyncedSubsurfaceViewer";
import { ViewportType, ViewsType } from "@webviz/subsurface-viewer";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";
import { ViewFooter } from "@webviz/subsurface-viewer/dist/components/ViewFooter";

import { isEqual } from "lodash";

import { IndexedSurfaceDatas, useSurfaceDataSetQueryByAddress } from "./hooks/useSurfaceDataAsPngQuery";
import { State } from "./state";

// viewports.append(
//     {
//         "id": f"{idx}_view",
//         "show3D": False,
//         "isSync": True,
//         "layerIds": [
//             f"{LayoutElements.MAP3D_LAYER}-{idx}"
//             if isinstance(surface_server, SurfaceArrayServer)
//             else f"{LayoutElements.COLORMAP_LAYER}-{idx}",
//             f"{LayoutElements.FAULTPOLYGONS_LAYER}-{idx}",
//             f"{LayoutElements.WELLS_LAYER}-{idx}",
//         ],
//         "name": make_viewport_label(surface_elements[idx], tab_name, multi),
//     }
// )
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
    surfaceDataSet.forEach((surface, index) => {
        if (surface.surfaceData) {
            layers.push(makeSurfaceImageLayer(`surface-${index}`, surface.surfaceData));
            views.viewports[index] = {
                id: `${index}view`,
                show3D: false,
                isSync: true,
                layerIds: [`surface-${index}`],
                name: `Surface ${index}`,
            };

            viewAnnotations.push(
                makeViewAnnotation(
                    `${index}view`,
                    `Surface ${index}`,
                    surface.surfaceData.val_min,
                    surface.surfaceData.val_max,
                    "Physics"
                )
            );
        }
    });

    return (
        <div className="relative w-full h-full flex flex-col">
            <div className="z-1">
                <SyncedSubsurfaceViewer
                    id={"test"}
                    layers={layers}
                    views={views}
                    workbenchServices={workbenchServices}
                    moduleContext={moduleContext}
                >
                    {viewAnnotations.map((viewAnnotation) => viewAnnotation)}
                </SyncedSubsurfaceViewer>
            </div>
        </div>
    );
}
function makeViewAnnotation(
    id: string,
    label: string,
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
                    // cssLegendStyles={{ top: "0", right: "0" }}
                    legendScaleSize={0.1}
                    legendFontSize={30}
                />
                <ViewFooter>{label}</ViewFooter>
            </>
        </View>
    );
}

function makeSurfaceImageLayer(id: string, surfaceData: SurfaceDataPng_api): Record<string, unknown> {
    return {
        "@@type": "ColormapLayer",
        id: id,
        image: `data:image/png;base64,${surfaceData.base64_encoded_image}`,
        bounds: [surfaceData.x_min, surfaceData.y_min, surfaceData.x_max, surfaceData.y_max],
        rotDeg: surfaceData.rot_deg,
        valueRange: [surfaceData.val_min, surfaceData.val_max],
    };
}

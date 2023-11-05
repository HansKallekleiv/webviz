import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { SyncedSubsurfaceViewer } from "@modules/SubsurfaceMap/components/SyncedSubsurfaceViewer";
import { ViewsType } from "@webviz/subsurface-viewer";

import { useSurfaceDataSetQueryByAddress } from "./hooks/useSurfaceDataAsPngQuery";
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
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const surfaceAddresses = moduleContext.useStoreValue("surfaceAddresses");
    const surfaceDataSetQueryByAddress = useSurfaceDataSetQueryByAddress(surfaceAddresses);

    const layers: Record<string, unknown>[] = [];
    const views: ViewsType = { layout: [10, 10], showLabel: false, viewports: [] };
    surfaceDataSetQueryByAddress.data?.forEach((surface, index) => {
        if (surface.surfaceData) {
            const surfData = surface.surfaceData;
            layers.push({
                "@@type": "ColormapLayer",
                id: `surface-${index}`,
                image: `data:image/png;base64,${surfData.base64_encoded_image}`,
                bounds: [surfData.x_min, surfData.y_min, surfData.x_max, surfData.y_max],
                rotDeg: surfData.rot_deg,
                valueRange: [surfData.val_min, surfData.val_max],
            });
            views.viewports.push({
                id: `surface-${index}`,
                show3D: false,
                isSync: true,
                layerIds: [`surface-${index}`],
                name: `Surface ${index}`,
            });
        }
    });
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <SyncedSubsurfaceViewer
                id={"test"}
                layers={layers}
                views={views}
                workbenchServices={workbenchServices}
                moduleContext={moduleContext}
            />
        </div>
    );
}

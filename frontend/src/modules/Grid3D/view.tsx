import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { SubsurfaceViewer } from "@webviz/subsurface-components";

import { useGridGeometry } from "./queryHooks";
import state from "./state";

//-----------------------------------------------------------------------------------------------------------
export function view({ moduleContext }: ModuleFCProps<state>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);

    const gridGeometryQuery = useGridGeometry();
    if (!gridGeometryQuery.data) {
        return <div>No data</div>;
    }

    const gridGeometry = gridGeometryQuery.data;
    const pointsArray = Array.from(gridGeometry.points);
    const polysArray = Array.from(gridGeometry.polys);
    const propertiesArray = Array.from(gridGeometry.property);

    return (
        <div className="relative w-full h-full flex flex-col">

            <SubsurfaceViewer
                id="deckgl"
                bounds={[gridGeometry.xmin, gridGeometry.ymin, gridGeometry.xmax, gridGeometry.ymax]}

                layers={[
                    {
                        "@@type": "AxesLayer",
                        "id": "axes-layer",
                        "bounds": [
                            gridGeometry.xmin, gridGeometry.ymin, -gridGeometry.zmax, gridGeometry.xmax, gridGeometry.ymax, -gridGeometry.zmin
                        ],
                    },
                    {
                        "@@type": "Grid3DLayer",
                        id: "grid3d-layer",
                        material: false,
                        pointsData: pointsArray,
                        polysData: polysArray,
                        propertiesData: propertiesArray,
                        colorMapName: "Physics",
                    },
                ]}
                views={{
                    "layout": [1, 1],
                    "viewports": [{ "id": "view_1", "show3D": true }],
                }}
            />
            <div className="absolute bottom-5 right-5 italic text-pink-400">{moduleContext.getInstanceIdString()}</div>
        </div>
    );
}

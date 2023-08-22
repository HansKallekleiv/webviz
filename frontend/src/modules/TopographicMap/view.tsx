import React from "react";

import { PolygonData_api, WellBoreTrajectory_api } from "@api";
import { ContinuousLegend, DiscreteColorLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Wellbore } from "@framework/Wellbore";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import SubsurfaceViewer from "@webviz/subsurface-viewer";
import { ViewStateType } from "@webviz/subsurface-viewer/dist/components/Map";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";

import {
    useGetFieldWellsTrajectories,
    usePolygonsDataQueryByAddress,
    usePropertySurfaceDataByQueryAddress,
    useSurfaceDataQueryByAddress,
} from "././queryHooks";
import {
    SurfaceMeta,
    createAxesLayer,
    createNorthArrowLayer,
    createSurfaceMeshLayer,
    createSurfacePolygonsLayer,
    createWellBoreHeaderLayer,
    createWellboreTrajectoryLayer,
} from "./_utils";
import { state } from "./state";

const JsonParseWithUndefined = (arrString: string): number[] => {
    const arr = JSON.parse(arrString);
    return arr.map((value: number) => (value === null ? undefined : value));
};
type Bounds = [number, number, number, number];

const updateViewPortBounds = (
    existingViewPortBounds: Bounds | undefined,
    resetBounds: boolean,
    surfaceMeta: SurfaceMeta
): Bounds => {
    let updatedBounds: Bounds = [surfaceMeta.x_min, surfaceMeta.y_min, surfaceMeta.x_max, surfaceMeta.y_max];

    if (!existingViewPortBounds || resetBounds) {
        return updatedBounds;
    }

    // Check if bounds overlap
    if (
        existingViewPortBounds[2] < updatedBounds[0] || // existing right edge is to the left of updated left edge
        existingViewPortBounds[0] > updatedBounds[2] || // existing left edge is to the right of updated right edge
        existingViewPortBounds[3] < updatedBounds[1] || // existing bottom edge is above updated top edge
        existingViewPortBounds[1] > updatedBounds[3] // existing top edge is below updated bottom edge
    ) {
        return updatedBounds; // Return updated bounds since they don't overlap
    }

    // Otherwise, return the existing bounds
    return existingViewPortBounds;
};
//-----------------------------------------------------------------------------------------------------------
export function view({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap view`);
    const viewIds = {
        view2D: `${myInstanceIdStr} -- view2D`,
        view3D: `${myInstanceIdStr} -- view3D`,
        annotation2D: `${myInstanceIdStr} -- annotation2D`,
        annotation3D: `${myInstanceIdStr} -- annotation3D`,
    };

    const meshSurfAddr = moduleContext.useStoreValue("meshSurfaceAddress");
    const propertySurfAddr = moduleContext.useStoreValue("propertySurfaceAddress");
    const polygonsAddr = moduleContext.useStoreValue("polygonsAddress");
    const selectedWellUuids = moduleContext.useStoreValue("selectedWellUuids");
    const surfaceSettings = moduleContext.useStoreValue("surfaceSettings");
    const viewSettings = moduleContext.useStoreValue("viewSettings");
    const [resetBounds, toggleResetBounds] = React.useState<boolean>(false);

    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);

    const show3D: boolean = viewSettings?.show3d ?? true;

    const meshSurfDataQuery = useSurfaceDataQueryByAddress(meshSurfAddr, true);

    const hasMeshSurfData = meshSurfDataQuery?.data ? true : false;
    const propertySurfDataQuery = usePropertySurfaceDataByQueryAddress(meshSurfAddr, propertySurfAddr, hasMeshSurfData);

    const wellTrajectoriesQuery = useGetFieldWellsTrajectories(meshSurfAddr?.caseUuid);
    const polygonsQuery = usePolygonsDataQueryByAddress(polygonsAddr);

    let newLayers: Record<string, unknown>[] = [createNorthArrowLayer()];

    let colorRange: [number, number] | undefined = undefined;

    // Mesh data query should only trigger update if the property surface address is not set or if the property surface data is loaded
    if (meshSurfDataQuery.data && !propertySurfAddr) {
        let newMeshData = JsonParseWithUndefined(meshSurfDataQuery.data.mesh_data);

        const newSurfaceMetaData: SurfaceMeta = { ...meshSurfDataQuery.data };
        const surfaceLayer: Record<string, unknown> = createSurfaceMeshLayer(
            newSurfaceMetaData,
            newMeshData,
            surfaceSettings
        );
        newLayers.push(surfaceLayer);
        colorRange = [meshSurfDataQuery.data.val_min, meshSurfDataQuery.data.val_max];
    } else if (meshSurfDataQuery.data && propertySurfDataQuery.data) {
        const newMeshData = JsonParseWithUndefined(meshSurfDataQuery.data.mesh_data);
        const newPropertyData = JsonParseWithUndefined(propertySurfDataQuery.data.mesh_data);

        const newSurfaceMetaData: SurfaceMeta = { ...meshSurfDataQuery.data };
        const surfaceLayer: Record<string, unknown> = createSurfaceMeshLayer(
            newSurfaceMetaData,
            newMeshData,
            surfaceSettings,
            newPropertyData
        );
        newLayers.push(surfaceLayer);
        colorRange = [propertySurfDataQuery.data.val_min, propertySurfDataQuery.data.val_max];
    }

    // Calculate viewport bounds and axes layer from the surface bounds.
    // TODO: Should be done automatically by the component while considering all layers, with an option to lock the bounds

    React.useEffect(() => {
        if (meshSurfDataQuery.data) {
            const newSurfaceMetaData: SurfaceMeta = { ...meshSurfDataQuery.data };

            setviewPortBounds(updateViewPortBounds(viewportBounds, resetBounds, newSurfaceMetaData));
            toggleResetBounds(false);

            const axesLayer: Record<string, unknown> = createAxesLayer([
                newSurfaceMetaData.x_min,
                newSurfaceMetaData.y_min,
                0,
                newSurfaceMetaData.x_max,
                newSurfaceMetaData.y_max,
                3500,
            ]);
            newLayers.push(axesLayer);
        }
    }, [meshSurfDataQuery.data, propertySurfDataQuery.data, resetBounds, viewportBounds]);

    if (polygonsQuery.data) {
        const polygonsData: PolygonData_api[] = polygonsQuery.data;
        const polygonsLayer: Record<string, unknown> = createSurfacePolygonsLayer(polygonsData);
        newLayers.push(polygonsLayer);
    }
    if (wellTrajectoriesQuery.data) {
        const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            selectedWellUuids.includes(well.wellbore_uuid)
        );
        const wellTrajectoryLayer: Record<string, unknown> = createWellboreTrajectoryLayer(wellTrajectories);
        const wellBoreHeaderLayer: Record<string, unknown> = createWellBoreHeaderLayer(wellTrajectories);
        newLayers.push(wellTrajectoryLayer);
        newLayers.push(wellBoreHeaderLayer);
    }

    function onCameraChange(viewport: ViewStateType) {
        syncHelper.publishValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap", {
            target: viewport.target,
            zoom: viewport.zoom as number,
            rotationX: viewport.rotationX,
            rotationOrbit: viewport.rotationOrbit,
        });
    }
    function onMouseEvent(event: any) {
        let clickedUWIs: Wellbore[] = [];
        if (event.type === "click") {
            if (syncHelper.isSynced(SyncSettingKey.WELLBORE)) {
                event.infos.forEach((info: any) => {
                    if (info.layer.id === "wells-layer") {
                        clickedUWIs.push({
                            type: "smda",
                            uwi: info.object.properties.uwi,
                            uuid: info.object.properties.uuid,
                        });
                    }
                    if (info.layer.id === "well-header-layer") {
                        clickedUWIs.push({
                            type: "smda",
                            uwi: info.object.uwi,
                            uuid: info.object.uuid,
                        });
                    }
                });
                if (clickedUWIs.length > 0) {
                    // Publish the first selected well bore
                    syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", clickedUWIs[0]);
                }
            }
        }
    }
    const cameraPosition3D =
        syncHelper.useValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap") || undefined;
    const isLoading =
        meshSurfDataQuery.isFetching ||
        propertySurfDataQuery.isFetching ||
        polygonsQuery.isFetching ||
        wellTrajectoriesQuery.isFetching;
    const isError =
        meshSurfDataQuery.isError ||
        propertySurfDataQuery.isError ||
        polygonsQuery.isError ||
        wellTrajectoriesQuery.isError;
    return (
        <div className="relative w-full h-full flex flex-col">
            <div>
                {isLoading && (
                    <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                        <CircularProgress />
                    </div>
                )}
                {isError && (
                    <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                        {"Error loading data"}
                    </div>
                )}
            </div>

            <div className="absolute top-0 right-0 z-10">
                <Button variant="contained" onClick={() => toggleResetBounds(!resetBounds)}>
                    Reset viewport bounds
                </Button>
            </div>
            <div className="z-1">
                {show3D ? (
                    <SubsurfaceViewer
                        id={viewIds.view3D}
                        bounds={viewportBounds}
                        layers={newLayers}
                        toolbar={{ visible: true }}
                        views={{
                            layout: [1, 1],
                            showLabel: false,
                            viewports: [
                                {
                                    id: "view_1",
                                    isSync: true,
                                    show3D: show3D,
                                    layerIds: newLayers.map((layer) => layer.id) as string[],
                                },
                            ],
                        }}
                        getCameraPosition={onCameraChange}
                        cameraPosition={cameraPosition3D}
                        onMouseEvent={onMouseEvent}
                    >
                        <ViewAnnotation id={viewIds.annotation3D}>
                            <ContinuousLegend
                                min={colorRange ? colorRange[0] : undefined}
                                max={colorRange ? colorRange[1] : undefined}
                                cssLegendStyles={{ bottom: "0", right: "0" }}
                            />
                        </ViewAnnotation>
                    </SubsurfaceViewer>
                ) : (
                    <SubsurfaceViewer
                        id={viewIds.view2D}
                        bounds={viewportBounds}
                        layers={newLayers}
                        toolbar={{ visible: true }}
                        views={{
                            layout: [1, 1],
                            showLabel: false,
                            viewports: [
                                {
                                    id: "view_2",
                                    isSync: true,
                                    show3D: false,
                                    layerIds: newLayers.map((layer) => layer.id) as string[],
                                },
                            ],
                        }}
                        onMouseEvent={onMouseEvent}
                    >
                        <ViewAnnotation id={viewIds.annotation2D}>
                            <ContinuousLegend
                                min={colorRange ? colorRange[0] : undefined}
                                max={colorRange ? colorRange[1] : undefined}
                                cssLegendStyles={{ bottom: "0", right: "0" }}
                            />
                        </ViewAnnotation>
                    </SubsurfaceViewer>
                )}
            </div>
        </div>
    );
}

import React from "react";

import { PolygonData_api, SurfaceData_api, SurfaceGridDefinition_api, WellBoreTrajectory_api } from "@api";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Wellbore } from "@framework/Wellbore";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { usePolygonsDataQueryByAddress } from "@modules/_shared/Polygons";
import { SurfaceData_trans } from "@modules/_shared/Surface/queryDataTransforms";
import {
    IndexedSurfaceDatas,
    useResampledSurfaceDataQueryByAddress,
    useSurfaceDataSetQueryByAddresses,
} from "@modules/_shared/Surface/queryHooks";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { useSurfaceDataQueryByAddress } from "@modules_shared/Surface";
import { ViewportType, ViewsType } from "@webviz/subsurface-viewer";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";

import { isEqual } from "lodash";

import {
    SurfaceMeta,
    createAxesLayer,
    createContinuousColorScaleForMap,
    createMapLayer,
    createNorthArrowLayer,
    createSurfacePolygonsLayer,
    createWellBoreHeaderLayer,
    createWellboreTrajectoryLayer,
} from "./_utils";
import { SyncedSubsurfaceViewer } from "./components/SyncedSubsurfaceViewer";
import { state } from "./state";

type Bounds = [number, number, number, number];

const updateViewPortBounds = (
    existingViewPortBounds: Bounds | undefined,
    resetBounds: boolean,
    xMin: number,
    yMin: number,
    xMax: number,
    yMax: number
): Bounds => {
    const updatedBounds: Bounds = [xMin, yMin, xMax, yMax];

    if (!existingViewPortBounds || resetBounds) {
        console.debug("updateViewPortBounds: no existing bounds, returning updated bounds");
        return updatedBounds;
    }

    // Check if bounds overlap
    if (
        existingViewPortBounds[2] < updatedBounds[0] || // existing right edge is to the left of updated left edge
        existingViewPortBounds[0] > updatedBounds[2] || // existing left edge is to the right of updated right edge
        existingViewPortBounds[3] < updatedBounds[1] || // existing bottom edge is above updated top edge
        existingViewPortBounds[1] > updatedBounds[3] // existing top edge is below updated bottom edge
    ) {
        console.debug("updateViewPortBounds: bounds don't overlap, returning updated bounds");
        return updatedBounds; // Return updated bounds since they don't overlap
    }

    // Otherwise, return the existing bounds
    return existingViewPortBounds;
};
//-----------------------------------------------------------------------------------------------------------
export function View({ moduleContext, workbenchSettings, workbenchServices }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap view`);
    const viewIds = {
        view2D: `${myInstanceIdStr} -- view2D`,
        view3D: `${myInstanceIdStr} -- view3D`,
        annotation2D: `${myInstanceIdStr} -- annotation2D`,
        annotation3D: `${myInstanceIdStr} -- annotation3D`,
    };

    const surfaceAddresses = moduleContext.useStoreValue("surfaceAddresses");
    const polygonsAddr = moduleContext.useStoreValue("polygonsAddress");
    const selectedWellUuids = moduleContext.useStoreValue("selectedWellUuids");
    const surfaceSettings = moduleContext.useStoreValue("surfaceSettings");
    const viewSettings = moduleContext.useStoreValue("viewSettings");
    const surfaceColorScale = moduleContext.useStoreValue("surfaceColorScale");
    const [resetBounds, toggleResetBounds] = React.useState<boolean>(false);
    const [axesLayer, setAxesLayer] = React.useState<Record<string, unknown> | null>(null);
    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);

    const surfaceDataQueries = useSurfaceDataSetQueryByAddresses(surfaceAddresses ?? []);

    const [prevSurfaceDataQueries, setPrevSurfaceDataQueries] = React.useState<IndexedSurfaceDatas | null>(null);

    let surfaceDataSet: Array<{
        index: number;
        surfaceData: SurfaceData_trans | null;
    }> = [];

    if (!surfaceDataQueries.isFetching && !isEqual(prevSurfaceDataQueries, surfaceDataQueries)) {
        setPrevSurfaceDataQueries(surfaceDataQueries);
        surfaceDataSet = surfaceDataQueries.data;
    } else if (prevSurfaceDataQueries) {
        surfaceDataSet = prevSurfaceDataQueries.data;
    }

    const caseUuid = surfaceAddresses?.[0]?.case_uuid;

    const wellTrajectoriesQuery = useFieldWellsTrajectoriesQuery(caseUuid);
    const polygonsQuery = usePolygonsDataQueryByAddress(polygonsAddr);

    const newLayers: Record<string, unknown>[] = [createNorthArrowLayer()];
    const workbenchColorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });
    const colorTables = surfaceColorScale
        ? createContinuousColorScaleForMap(surfaceColorScale)
        : createContinuousColorScaleForMap(workbenchColorScale);

    let colorRange: [number, number] | null = null;
    if (surfaceColorScale) {
        colorRange = [surfaceColorScale.getMin(), surfaceColorScale.getMax()];
    }

    const views: ViewsType = makeEmptySurfaceViews(surfaceDataSet.length ?? 1);

    const viewAnnotations: JSX.Element[] = [];
    newLayers.push({
        "@@type": "Axes2DLayer",
        id: "axes-layer2D",
        marginH: 80,
        marginV: 30,
        isLeftRuler: true,
        isRightRuler: false,
        isBottomRuler: false,
        isTopRuler: true,
        backgroundColor: [255, 255, 255, 255],
    });
    surfaceDataSet.forEach((surface, index) => {
        const valueMin = surface?.surfaceData?.val_min ?? 0;
        const valueMax = surface?.surfaceData?.val_max ?? 0;
        if (surface.surfaceData) {
            const newBounds: [number, number, number, number] = [
                surface.surfaceData.x_min,
                surface.surfaceData.y_min,
                surface.surfaceData.x_max,
                surface.surfaceData.y_max,
            ];
            if (!viewportBounds) {
                setviewPortBounds(newBounds);
            }

            newLayers.push(
                createMapLayer({
                    id: `surface-${index}`,
                    mesh_data: Array.from(surface.surfaceData.valuesFloat32Arr),
                    xOri: surface.surfaceData.x_ori,
                    yOri: surface.surfaceData.y_ori,
                    xCount: surface.surfaceData.x_count,
                    yCount: surface.surfaceData.y_count,
                    xInc: surface.surfaceData.x_inc,
                    yInc: surface.surfaceData.y_inc,
                    rotDeg: surface.surfaceData.rot_deg,
                    contours: surfaceSettings?.contours ? surfaceSettings.contours : null,
                    colorMapRange: colorRange,
                    colorMapName: "Continuous",
                })
            );
            views.viewports[index] = {
                id: `${index}view`,
                show3D: false,
                isSync: true,
                layerIds: ["axes-layer2D", "surf-poly-layer", `surface-${index}`],
                name: `Surface ${index}`,
            };
        }
        // viewAnnotations.push(
        //     makeViewAnnotation(
        //         `${index}view`,
        //         surfaceSpecifications[index],
        //         colorTables,
        //         colorMin || valueMin,
        //         colorMax || valueMax
        //     )
        // );
    });

    // Calculate viewport bounds and axes layer from the surface bounds.
    // TODO: Should be done automatically by the component while considering all layers, with an option to lock the bounds
    const firstSurface = surfaceDataSet[0]?.surfaceData;
    React.useEffect(() => {
        if (firstSurface) {
            setviewPortBounds(
                updateViewPortBounds(
                    viewportBounds,
                    resetBounds,
                    firstSurface.x_min,
                    firstSurface.y_min,
                    firstSurface.x_max,
                    firstSurface.y_max
                )
            );
            toggleResetBounds(false);

            const axesLayer: Record<string, unknown> = createAxesLayer([
                firstSurface.x_min,
                firstSurface.y_min,
                0,
                firstSurface.x_max,
                firstSurface.y_max,
                3500,
            ]);
            setAxesLayer(axesLayer);
        }
    }, [prevSurfaceDataQueries, resetBounds, viewportBounds]);

    axesLayer && newLayers.push(axesLayer);

    if (polygonsQuery.data) {
        const polygonsData: PolygonData_api[] = polygonsQuery.data;
        const polygonsLayer: Record<string, unknown> = createSurfacePolygonsLayer({
            id: "surf-poly-layer",
            data: polygonsData,
        });
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

    function onMouseEvent(event: any) {
        const clickedUWIs: Wellbore[] = [];
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

    const isLoading =
        // meshSurfDataQuery.isFetching ||
        // propertySurfDataQuery.isFetching ||
        // polygonsQuery.isFetching ||
        wellTrajectoriesQuery.isFetching;
    const isError =
        // meshSurfDataQuery.isError ||
        // propertySurfDataQuery.isError ||
        // polygonsQuery.isError ||
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

            {/* <div className="absolute top-0 right-0 z-10">
                <Button variant="contained" onClick={() => toggleResetBounds(!resetBounds)}>
                    Reset viewport bounds
                </Button>
            </div> */}
            <div className="z-1">
                <SyncedSubsurfaceViewer
                    moduleContext={moduleContext}
                    workbenchServices={workbenchServices}
                    id={viewIds.view2D}
                    bounds={viewportBounds}
                    layers={newLayers}
                    colorTables={colorTables}
                    views={views}
                    onMouseEvent={onMouseEvent}
                ></SyncedSubsurfaceViewer>
            </div>
        </div>
    );
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

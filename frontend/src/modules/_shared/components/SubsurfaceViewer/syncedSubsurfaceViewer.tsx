import { WellBoreTrajectory_api } from "@api";
import { ModuleContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import SubsurfaceViewer, { SubsurfaceViewerProps } from "@webviz/subsurface-viewer";
import { ViewStateType } from "@webviz/subsurface-viewer/dist/components/Map";
import { PointsLayer } from "@webviz/subsurface-viewer/dist/layers";

export type SyncedSubsurfaceViewerProps = {
    moduleContext: ModuleContext<any>;
    workbenchServices: WorkbenchServices;
    wellTrajectoriesData?: WellBoreTrajectory_api[] | null;
    usePos?: boolean;
} & SubsurfaceViewerProps;

export function SyncedSubsurfaceViewer(props: SyncedSubsurfaceViewerProps): JSX.Element {
    const { moduleContext, workbenchServices, ...rest } = props;
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();

    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedWellBore = syncHelper.useValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore");
    let { layers, usePos, views, ...restProps } = rest;

    let cameraPosition: ViewStateType | null = null;
    layers = layers || [];
    let pointLayer: PointsLayer | null = null;
    if (props.wellTrajectoriesData && layers && views) {
        const tvd = syncedWellBore ? syncedWellBore.md : null;
        const well = props.wellTrajectoriesData.find(
            (well) => well.unique_wellbore_identifier === syncedWellBore?.wellbore.uwi
        );
        if (tvd && well) {
            const coordinates = interpolateXY(well, tvd);
            console.log(coordinates);
            pointLayer = new PointsLayer({
                "@@type": "PointsLayer",
                id: "small_points_layer",
                name: "wellpoint",
                pointsData: coordinates ?? [],
                color: [255, 215, 0, 150],
                pointRadius: 10,
                radiusUnits: "pixels",
                ZIncreasingDownwards: false,
                depthTest: false,
            });
            if (usePos) {
                const cam = calculateBearingAndPitch(coordinates, interpolateXY(well, tvd + 100));
                // console.log(cam);
                cameraPosition = {
                    target: coordinates || [],
                    zoom: -1,
                    rotationX: 180 - cam.rotationX,
                    rotationOrbit: 0,
                    transitionDuration: 10,
                };
            }
            if (views && views.viewports && views.viewports[0] && views.viewports[0].layerIds) {
                views.viewports[0].layerIds.push(pointLayer.id);
            }
        }
    }
    function onCameraChange(viewport: ViewStateType) {
        syncHelper.publishValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap", {
            target: viewport.target,
            zoom: viewport.zoom as number,
            rotationX: viewport.rotationX,
            rotationOrbit: viewport.rotationOrbit,
        });
    }
    const cameraPosition3D =
        syncHelper.useValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap") || undefined;

    return (
        <SubsurfaceViewer
            getCameraPosition={onCameraChange}
            cameraPosition={cameraPosition ? cameraPosition : cameraPosition3D}
            layers={pointLayer ? [...layers, pointLayer] : layers}
            views={views}
            {...restProps}
        ></SubsurfaceViewer>
    );
}
type WellPathPoint = {
    x: number;
    y: number;
    z: number;
    md: number;
};

function interpolateXY(trajectory: WellBoreTrajectory_api, md: number): number[] {
    const points: WellPathPoint[] = trajectory.md_arr.map((mdValue, i) => ({
        x: trajectory.easting_arr[i],
        y: trajectory.northing_arr[i],
        md: trajectory.md_arr[i],
        z: -trajectory.tvd_msl_arr[i],
    }));

    const minMd = Math.min(...trajectory.md_arr);
    const maxMd = Math.max(...trajectory.md_arr);

    const clampedMd = Math.max(minMd, Math.min(md, maxMd));

    for (let i = 0; i < points.length - 1; i++) {
        if (clampedMd >= points[i].md && clampedMd <= points[i + 1].md) {
            const { x: x1, y: y1, z: z1 } = points[i];
            const { x: x2, y: y2, z: z2 } = points[i + 1];

            const mdRatio = (clampedMd - points[i].md) / (points[i + 1].md - points[i].md);

            const x = x1 + (x2 - x1) * mdRatio;
            const y = y1 + (y2 - y1) * mdRatio;
            const z = z1 + (z2 - z1) * mdRatio;
            return [x, y, z];
        }
    }

    if (clampedMd === minMd) {
        return [points[0].x, points[0].y, points[0].z];
    } else if (clampedMd === maxMd) {
        const lastPoint = points[points.length - 1];
        return [lastPoint.x, lastPoint.y, lastPoint.z];
    }

    return [0, 0, 0];
}

function calculateBearingAndPitch(p1: number[], p2: number[]) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];

    const bearingRadians = Math.atan2(dy, dx);
    const pitchRadians = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy + dz * dz));

    return {
        rotationOrbit: (bearingRadians * (180 / Math.PI) + 360) % 360,
        rotationX: 90 - pitchRadians * (180 / Math.PI),
    };
}

import { WellBoreTrajectory_api } from "@api";

import { Feature, FeatureCollection, LineString, Point } from "geojson";
import { isEqual } from "lodash";

import { filterAndInterpolateWellPath } from "./interpolation";

export interface WellPoint {
    x: number;
    y: number;
    z: number;
    md: number;
}
export function createWellsFeatureCollection(
    wellTrajectories: WellBoreTrajectory_api[],
    filterTvdAbove: number | null,
    filterTvdBelow: number | null,
    selectedWell?: string
): FeatureCollection {
    const features: Feature[] = wellTrajectories.map((wellTrajectory) => {
        return createWellGeoJSONFeature(wellTrajectory, filterTvdAbove, filterTvdBelow, selectedWell);
    });
    const data: FeatureCollection = {
        type: "FeatureCollection",
        features: features,
    };
    return data;
}

function createWellGeoJSONFeature(
    wellTrajectory: WellBoreTrajectory_api,
    filterTvdAbove: number | null,
    filterTvdBelow: number | null,
    selectedWell?: string
): Feature {
    let wellPoints: WellPoint[] = wellTrajectory.easting_arr.map((easting, index) => {
        return {
            x: easting,
            y: wellTrajectory.northing_arr[index],
            z: wellTrajectory.tvd_msl_arr[index],
            md: wellTrajectory.md_arr[index],
        };
    });
    if (filterTvdAbove === null || filterTvdBelow === null) {
        const minZ = Math.min(...wellPoints.map((point) => point.z));
        const maxZ = Math.max(...wellPoints.map((point) => point.z));

        let topZ = minZ;
        let baseZ = maxZ;

        if (filterTvdAbove !== null) {
            topZ = Math.max(minZ, filterTvdAbove);
        }
        if (filterTvdBelow !== null) {
            baseZ = Math.min(maxZ, filterTvdBelow);
        }
        if (topZ > baseZ) {
            topZ = minZ;
        }
        if (baseZ < topZ) {
            baseZ = maxZ;
            wellPoints = filterAndInterpolateWellPath(wellPoints, topZ, baseZ);
        }
    }
    // console.log(isEqual(wellPoints, updatedWellPoints));
    const wellPath: { x: number; y: number; z: number; md: number }[] = wellPoints.map((point) => {
        return { x: point.x, y: point.y, z: point.z, md: point.md };
    });

    const point: Point = {
        type: "Point",
        coordinates: [wellPath[0].x, wellPath[0].y, wellPath[0].z],
    };
    const coordinates: LineString = {
        type: "LineString",
        coordinates: wellPath.map((point) => [point.x, point.y, point.z]),
    };
    const geometryCollection: Feature = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [point, coordinates],
        },
        properties: {
            uuid: wellTrajectory.wellbore_uuid,
            name: wellTrajectory.unique_wellbore_identifier,
            uwi: wellTrajectory.unique_wellbore_identifier,

            color:
                selectedWell && wellTrajectory.unique_wellbore_identifier === selectedWell
                    ? [0, 0, 0, 100]
                    : [255, 255, 255],
            md: [wellPath.map((point) => point.md)],
        },
    };

    return geometryCollection;
}

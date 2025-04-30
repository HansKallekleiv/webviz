import type { BBox } from "@lib/utils/bbox";
import type { WellTrajectorySegment } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/utils/WellTrajectories";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makeDrilledWellTrajectoriesBoundingBox({
    getData,
}: TransformerArgs<any, WellTrajectorySegment[]>): BBox | null {
    const segments = getData();

    // Handle cases where data is null, undefined, or empty
    if (!segments || segments.length === 0) {
        return null;
    }

    const bbox: BBox = {
        min: {
            x: Infinity,
            y: Infinity,
            z: Infinity,
        },
        max: {
            x: -Infinity,
            y: -Infinity,
            z: -Infinity,
        },
    };

    let hasPoints = false;

    // Iterate over each SEGMENT
    for (const segment of segments) {
        // Iterate over points within the segment's coordinate arrays
        for (const point of segment.eastingArr) {
            bbox.min.x = Math.min(bbox.min.x, point);
            bbox.max.x = Math.max(bbox.max.x, point);
            hasPoints = true;
        }

        for (const point of segment.northingArr) {
            bbox.min.y = Math.min(bbox.min.y, point);
            bbox.max.y = Math.max(bbox.max.y, point);
            hasPoints = true;
        }

        for (const point of segment.tvdMslArr) {
            bbox.min.z = Math.min(bbox.min.z, point);
            bbox.max.z = Math.max(bbox.max.z, point);
            hasPoints = true;
        }
    }

    // If no valid points were found across all segments, return null
    if (!hasPoints) {
        return null;
    }

    return bbox;
}

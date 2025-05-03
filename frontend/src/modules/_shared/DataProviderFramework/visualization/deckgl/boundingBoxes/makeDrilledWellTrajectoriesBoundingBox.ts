import type { BBox } from "@lib/utils/bbox";
// Import the new segment type
import type { WellTrajectorySegment } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/utils/WellTrajectories";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

// Remove the import for WellTrajectoryData if no longer needed here

/**
 * Calculates the bounding box encompassing all points from all well trajectory segments.
 */
export function makeDrilledWellTrajectoriesBoundingBox({
    getData,
}: TransformerArgs<any, WellTrajectorySegment[]>): BBox | null {
    // <-- Expect WellTrajectorySegment[]
    const segments = getData(); // Now gets WellTrajectorySegment[]

    // Handle cases where data is null, undefined, or empty
    if (!segments || segments.length === 0) {
        return null;
    }

    // Initialize bounding box with inverted limits
    const bbox: BBox = {
        min: {
            x: Infinity, // Use Infinity for clearer initial min
            y: Infinity,
            z: Infinity,
        },
        max: {
            x: -Infinity, // Use -Infinity for clearer initial max
            y: -Infinity,
            z: -Infinity,
        },
    };

    let hasPoints = false; // Flag to check if any points were processed

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

        // Remember TVD is often "depth" (positive down),
        // check if Z for bounding box should be depth or elevation.
        // Assuming Z should represent the same coordinate system as TVDMSL here.
        // Negate if Z represents elevation (positive up) like in the GeoJSON conversion.
        // Let's assume Z here corresponds directly to TVDMSL values for the BBox.
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

    // Optional: Add padding to the bounding box if needed
    // const padding = 100; // Example padding value
    // bbox.min.x -= padding;
    // bbox.min.y -= padding;
    // bbox.min.z -= padding; // Adjust padding logic based on Z direction
    // bbox.max.x += padding;
    // bbox.max.y += padding;
    // bbox.max.z += padding;

    return bbox;
}

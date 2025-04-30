import type { WellboreTrajectory_api } from "@api";
import type { BBox } from "@lib/utils/bbox";
import { WellTrajectoryData } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellTrajectoriesProvider";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makeDrilledWellTrajectoriesBoundingBox({
    getData,
}: TransformerArgs<any, WellTrajectoryData[]>): BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    const bbox: BBox = {
        min: {
            x: Number.MAX_SAFE_INTEGER,
            y: Number.MAX_SAFE_INTEGER,
            z: Number.MAX_SAFE_INTEGER,
        },
        max: {
            x: Number.MIN_SAFE_INTEGER,
            y: Number.MIN_SAFE_INTEGER,
            z: Number.MIN_SAFE_INTEGER,
        },
    };

    for (const well of data) {
        for (const point of well.eastingArr) {
            bbox.min.x = Math.min(bbox.min.x, point);
            bbox.max.x = Math.max(bbox.max.x, point);
        }

        for (const point of well.northingArr) {
            bbox.min.y = Math.min(bbox.min.y, point);
            bbox.max.y = Math.max(bbox.max.y, point);
        }

        for (const point of well.tvdMslArr) {
            bbox.min.z = Math.min(bbox.min.z, point);
            bbox.max.z = Math.max(bbox.max.z, point);
        }
    }

    return bbox;
}

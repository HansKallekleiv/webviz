import type { WellFlowData_api, WellboreHeader_api, WellboreTrajectory_api } from "@api";
import { AdvancedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdvancedWellsLayer";
import { F } from "@tanstack/query-core/build/legacy/hydration-DpBMnFDT";
import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { Feature, GeoJsonProperties, GeometryCollection, LineString, Point } from "geojson";

import {
    DrilledWellData,
    DrilledWellDataWithFlowTypes,
    FlowType,
} from "../../dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { Setting } from "../../settings/settingsDefinitions";
import type { TransformerArgs } from "../VisualizationAssembler";

function wellTrajectoryToGeojson(
    wellTrajectory: WellboreTrajectory_api,
    color: [number, number, number, number] = [100, 100, 100, 100],
): Feature<GeometryCollection, GeoJsonProperties> {
    const point: Point = {
        type: "Point",
        coordinates: [wellTrajectory.eastingArr[0], wellTrajectory.northingArr[0], -wellTrajectory.tvdMslArr[0]],
    };

    const coordinates: LineString = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.eastingArr, wellTrajectory.northingArr, wellTrajectory.tvdMslArr),
    };

    const lineWidth = 40;
    const wellHeadSize = 1;

    const geometryCollection: Feature<GeometryCollection, GeoJsonProperties> = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [point, coordinates],
        },
        properties: {
            uuid: wellTrajectory.wellboreUuid,
            name: wellTrajectory.uniqueWellboreIdentifier,
            uwi: wellTrajectory.uniqueWellboreIdentifier,
            color,
            md: [wellTrajectory.mdArr],
            lineWidth,
            wellHeadSize,
        },
    };

    return geometryCollection;
}

function zipCoords(xArr: number[], yArr: number[], zArr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < xArr.length; i++) {
        coords.push([xArr[i], yArr[i], -zArr[i]]);
    }

    return coords;
}

export function makeDrilledWellTrajectoriesLayer({
    id,
    getData,
    getSetting,
}: TransformerArgs<any, DrilledWellDataWithFlowTypes[]>): WellsLayer | null {
    const data = getData();

    if (!data) {
        return null;
    }
    const flowTypes = getSetting(Setting.FLOW_TYPES);
    // Filter out some wellbores that are known to be not working - this is a temporary solution
    const tempWorkingWellsData = data.filter((el) => el.trajectoryData.uniqueWellboreIdentifier !== "NO 34/4-K-3 AH");

    const wellLayerDataFeatures = tempWorkingWellsData.map((well) => {
        const color: [number, number, number, number] = well.flowType
            ? well.flowType === FlowType.OIL_PROD
                ? [0, 128, 0, 255]
                : well.flowType === FlowType.GAS_PROD
                  ? [255, 0, 0, 255]
                  : well.flowType === FlowType.WATER_PROD
                    ? [0, 0, 255, 255]
                    : [50, 50, 50, 255]
            : [50, 50, 50, 255];

        return wellTrajectoryToGeojson(well.trajectoryData, color);
    });

    function getLineStyleWidth(object: Feature): number {
        if (object.properties && "lineWidth" in object.properties) {
            return object.properties.lineWidth as number;
        }
        return 4;
    }

    function getWellHeadStyleWidth(object: Feature): number {
        if (object.properties && "wellHeadSize" in object.properties) {
            return object.properties.wellHeadSize as number;
        }
        return 1;
    }

    function getColor(object: Feature): [number, number, number, number] {
        if (object.properties && "color" in object.properties) {
            return object.properties.color as [number, number, number, number];
        }

        return [50, 50, 50, 1];
    }

    const wellsLayer = new AdvancedWellsLayer({
        id: id,
        data: {
            type: "FeatureCollection",
            unit: "m",
            features: wellLayerDataFeatures,
        },
        refine: false,
        lineStyle: { width: getLineStyleWidth, color: getColor },
        wellHeadStyle: { size: getWellHeadStyleWidth, color: getColor },
        wellNameVisible: true,
        pickable: true,
        ZIncreasingDownwards: false,
        outline: false,
        lineWidthScale: 2,
    });

    return wellsLayer;
}

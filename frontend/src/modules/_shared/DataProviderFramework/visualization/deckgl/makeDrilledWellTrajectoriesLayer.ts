import type { WellFlowData_api, WellboreCompletionSmda_api, WellboreHeader_api } from "@api";
import { PathStyleExtension } from "@deck.gl/extensions";
import { GeoJsonLayer } from "@deck.gl/layers";
import { AdvancedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdvancedWellsLayer";
import { C, F, o } from "@tanstack/query-core/build/legacy/hydration-DpBMnFDT";
import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { Feature, FeatureCollection, GeoJsonProperties, GeometryCollection, LineString, Point } from "geojson";

import {
    CompletionType,
    FlowType,
    WellTrajectoryData,
} from "../../dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { Setting } from "../../settings/settingsDefinitions";
import type { TransformerArgs } from "../VisualizationAssembler";

function wellTrajectoryToGeojson(wellTrajectory: WellTrajectoryData): Feature[] {
    const point: Point = {
        type: "Point",
        coordinates: [wellTrajectory.eastingArr[0], wellTrajectory.northingArr[0], -wellTrajectory.tvdMslArr[0]],
    };
    const pointFeature: Feature<Point, GeoJsonProperties> = {
        type: "Feature",
        geometry: point,
        properties: {
            uuid: wellTrajectory.wellboreUuid,
            name: wellTrajectory.uniqueWellboreIdentifier,
            uwi: wellTrajectory.uniqueWellboreIdentifier,
            color: colorOnFlowType(wellTrajectory.flowType),
            md: [wellTrajectory.mdArr[0]],
            lineWidth: 20,
            wellHeadSize: 1,
        },
    };

    const lineFeatureArr: Feature<LineString, GeoJsonProperties>[] = [];

    let startIndex = 0;
    let currentCompletionType = wellTrajectory.completionArr[0];

    for (let i = 1; i < wellTrajectory.completionArr.length; i++) {
        const nextCompletion = wellTrajectory.completionArr[i];

        if (nextCompletion !== currentCompletionType) {
            // Close the current segment here (up to i)
            const coordinates: LineString = {
                type: "LineString",
                coordinates: zipCoords(
                    wellTrajectory.eastingArr.slice(startIndex, i + 1),
                    wellTrajectory.northingArr.slice(startIndex, i + 1),
                    wellTrajectory.tvdMslArr.slice(startIndex, i + 1),
                ),
            };

            const lineFeature: Feature<LineString, GeoJsonProperties> = {
                type: "Feature",
                geometry: coordinates,
                properties: {
                    uuid: wellTrajectory.wellboreUuid,
                    name: wellTrajectory.uniqueWellboreIdentifier,
                    uwi: wellTrajectory.uniqueWellboreIdentifier,
                    color: colorOnFlowType(wellTrajectory.flowType),
                    completion: currentCompletionType,
                    md: [wellTrajectory.mdArr[startIndex]],
                    lineWidth: currentCompletionType === CompletionType.NONE ? 2 : 4,
                    wellHeadSize: 1,
                },
            };

            lineFeatureArr.push(lineFeature);

            // Start new segment
            startIndex = i;
            currentCompletionType = nextCompletion;
        }
    }

    // Catch the final segment after the loop ends
    if (startIndex < wellTrajectory.eastingArr.length - 1) {
        const coordinates: LineString = {
            type: "LineString",
            coordinates: zipCoords(
                wellTrajectory.eastingArr.slice(startIndex),
                wellTrajectory.northingArr.slice(startIndex),
                wellTrajectory.tvdMslArr.slice(startIndex),
            ),
        };

        const lineFeature: Feature<LineString, GeoJsonProperties> = {
            type: "Feature",
            geometry: coordinates,
            properties: {
                uuid: wellTrajectory.wellboreUuid,
                name: wellTrajectory.uniqueWellboreIdentifier,
                uwi: wellTrajectory.uniqueWellboreIdentifier,
                color: colorOnFlowType(wellTrajectory.flowType),
                completion: currentCompletionType,
                md: [wellTrajectory.mdArr[startIndex]],
                lineWidth: currentCompletionType === CompletionType.NONE ? 2 : 4,
                wellHeadSize: 1,
            },
        };

        lineFeatureArr.push(lineFeature);
    }

    return [pointFeature, ...lineFeatureArr];
}

// const lineWidth = 40;
// const wellHeadSize = 1;
// const color = colorOnFlowType(wellTrajectory.flowType);
// const geometryCollection: Feature<GeometryCollection, GeoJsonProperties> = {
//     type: "Feature",
//     geometry: {
//         type: "GeometryCollection",
//         geometries: [point, coordinates],
//     },
//     properties: {
//         uuid: wellTrajectory.wellboreUuid,
//         name: wellTrajectory.uniqueWellboreIdentifier,
//         uwi: wellTrajectory.uniqueWellboreIdentifier,
//         completions: wellTrajectory.completionArr as CompletionType[],
//         color,
//         md: [wellTrajectory.mdArr],
//         lineWidth,
//         wellHeadSize,
//     },
// };

// return geometryCollection;
// }

function zipCoords(xArr: number[], yArr: number[], zArr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < xArr.length; i++) {
        coords.push([xArr[i], yArr[i], -zArr[i]]);
    }

    return coords;
}
function colorOnFlowType(flowType: FlowType | null): [number, number, number, number] {
    switch (flowType) {
        case FlowType.OIL_PROD:
            return [0, 128, 0, 255];
        case FlowType.GAS_PROD:
            return [255, 0, 0, 255];
        case FlowType.WATER_PROD:
            return [0, 0, 255, 255];
        default:
            return [50, 50, 50, 255];
    }
}

export function makeDrilledWellTrajectoriesLayer({
    id,
    getData,
    getSetting,
}: TransformerArgs<any, WellTrajectoryData[]>): GeoJsonLayer | null {
    const data = getData();

    if (!data) {
        return null;
    }

    const wellLayerDataFeatures = data.flatMap((wellData) => {
        return wellTrajectoryToGeojson(wellData);
    });

    function getLineStyleWidth(object: Feature): number {
        if (object.properties && "lineWidth" in object.properties) {
            return object.properties.lineWidth as number;
        }
        return 1;
    }
    // Dash based on completion
    function getLineStyleDash(object: Feature): any {
        if (object.properties && "completion" in object.properties) {
            const completion = object.properties.completion as CompletionType;
            if (completion === CompletionType.NONE) {
                return [0, 0];
            }
            return [1, 2];
        }
        return [0, 0];
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

    const wellsLayer = new GeoJsonLayer({
        id: id,
        data: wellLayerDataFeatures,
        getLineWidth: getLineStyleWidth,
        getDashArray: getLineStyleDash,
        extensions: [new PathStyleExtension({ dash: true })],
        getLineColor: getColor,
        lineStyle: { width: getLineStyleWidth, color: getColor, dash: getLineStyleDash },
        lineWidthMinPixels: 1,
        // wellHeadStyle: { size: getWellHeadStyleWidth, color: getColor },
        // wellNameVisible: true,
        // pickable: true,
        // ZIncreasingDownwards: false,
        // outline: false,
        lineWidthScale: 2,
        depthTest: false,
        autoHighlight: true,
        pickable: true,
        highlightColor: [255, 255, 0, 255],
        pickingRadius: 10,
    });

    return wellsLayer;
}

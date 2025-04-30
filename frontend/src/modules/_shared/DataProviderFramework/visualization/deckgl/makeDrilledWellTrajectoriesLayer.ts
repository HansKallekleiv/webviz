import type { WellFlowData_api, WellboreCompletionSmda_api, WellboreHeader_api } from "@api";
import { PathStyleExtension } from "@deck.gl/extensions";
import { GeoJsonLayer } from "@deck.gl/layers";
import { AdvancedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdvancedWellsLayer";
import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { Feature, FeatureCollection, GeoJsonProperties, GeometryCollection, LineString, Point } from "geojson";

import {
    CompletionType,
    FlowType,
    WellTrajectoryData,
} from "../../dataProviders/implementations/DrilledWellTrajectoriesProvider";
import { WellTrajectorySegment } from "../../dataProviders/implementations/utils/WellTrajectories";
import { Setting } from "../../settings/settingsDefinitions";
import type { TransformerArgs } from "../VisualizationAssembler";

// Function to convert one well segment to one GeoJSON LineString feature
function segmentToGeoJsonFeature(segment: WellTrajectorySegment): Feature<LineString> | null {
    const coords: number[][] = [];
    // Ensure Z is negated for visualization if necessary
    for (let i = 0; i < segment.eastingArr.length; i++) {
        coords.push([segment.eastingArr[i], segment.northingArr[i], -segment.tvdMslArr[i]]);
    }

    // Only return a feature if it has enough points for a line
    if (coords.length < 2) {
        return null;
    }

    const line: LineString = { type: "LineString", coordinates: coords };

    // Determine color based on flowType
    const color = colorOnFlowType(segment.flowType);

    // Determine line width based on completion type
    const lineWidth = segment.completionType === CompletionType.NONE ? 2 : 4;

    const feature: Feature<LineString> = {
        type: "Feature",
        geometry: line,
        properties: {
            uuid: segment.wellboreUuid,
            name: segment.uniqueWellboreIdentifier,
            segmentId: segment.segmentId,
            completion: segment.completionType,
            color: color,
            lineWidth: lineWidth,

            startMd: segment.mdArr[0],
            endMd: segment.mdArr[segment.mdArr.length - 1],
        },
    };
    return feature;
}

function colorOnFlowType(flowType: FlowType | null): [number, number, number, number] {
    switch (flowType) {
        case FlowType.OIL_PROD:
            return [102, 255, 0, 255];
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
}: TransformerArgs<any, WellTrajectorySegment[]>): GeoJsonLayer | null {
    const segments = getData();

    if (!segments || segments.length === 0) {
        return null;
    }

    const features = segments.map(segmentToGeoJsonFeature).filter((f) => f !== null) as Feature<LineString>[];

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
        data: features,
        getLineWidth: getLineStyleWidth,
        getLineColor: getColor,
        getDashArray: getLineStyleDash,
        extensions: [new PathStyleExtension({ dash: true })],
        lineWidthMinPixels: 6,
        lineWidthMaxPixels: 10,
        lineWidthScale: 4,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 0, 255],
        depthTest: false,
        pickingRadius: 10,
    });

    return wellsLayer;
}

import { PolygonData_api, WellBoreTrajectory_api } from "@api";
import { colorTablesObj } from "@emerson-eps/color-tables";
import { Wellbore } from "@framework/Wellbore";
import { ColorScale } from "@lib/utils/ColorScale";

import { formatRgb } from "culori";

export type SurfaceMeshLayerSettings = {
    contours?: boolean | number[];
    gridLines?: boolean;
    smoothShading?: boolean;
    material?: boolean;
};

export type ViewSettings = {
    show3d: boolean;
};
export type SurfaceMeta = {
    x_ori: number;
    y_ori: number;
    x_count: number;
    y_count: number;
    x_inc: number;
    y_inc: number;
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    val_min: number;
    val_max: number;
    rot_deg: number;
};

const defaultSurfaceSettings: SurfaceMeshLayerSettings = {
    contours: false,
    gridLines: false,
    smoothShading: false,
    material: false,
};
function rgbStringToArray(rgbString: string): number[] | null {
    const match = rgbString.match(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
    if (match) {
        return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
    }
    return null;
}
export function colorScaleToSubsurfaceMapColorScale(colorScale: ColorScale): colorTablesObj[] {
    const hexColors = colorScale.getPlotlyColorScale();
    const rgbArr: [number, number, number, number][] = [];
    hexColors.forEach((color) => {
        const rgbString: string = formatRgb(color[1]) as string;
        const rgb = rgbStringToArray(rgbString);
        if (rgb) {
            rgbArr.push([color[0], rgb[0], rgb[1], rgb[2]]);
        }
    });
    console.log([{ name: "Continuous", discrete: false, colors: rgbArr }]);
    return [{ name: "Continuous", discrete: false, colors: rgbArr }];
}
export function createNorthArrowLayer(visible?: boolean): Record<string, unknown> {
    return {
        "@@type": "NorthArrow3DLayer",
        id: "north-arrow-layer",
        visible: visible === undefined ? true : visible,
    };
}
export function createAxesLayer(
    bounds: [number, number, number, number, number, number],
    visible?: boolean
): Record<string, unknown> {
    return {
        "@@type": "AxesLayer",
        id: "axes-layer",
        visible: visible === undefined ? true : visible,
        bounds: bounds,
    };
}
export function createSurfaceMeshLayer(
    surfaceMeta: SurfaceMeta,
    mesh_data: number[],
    surfaceSettings?: SurfaceMeshLayerSettings | null,
    property_data?: number[] | null
): Record<string, unknown> {
    surfaceSettings = surfaceSettings || defaultSurfaceSettings;
    return {
        "@@type": "MapLayer",
        id: "mesh-layer",
        meshData: mesh_data,
        propertiesData: property_data,
        frame: {
            origin: [surfaceMeta.x_ori, surfaceMeta.y_ori],
            count: [surfaceMeta.x_count, surfaceMeta.y_count],
            increment: [surfaceMeta.x_inc, surfaceMeta.y_inc],
            rotDeg: surfaceMeta.rot_deg,
        },

        contours: surfaceSettings.contours || false,
        isContoursDepth: true,
        gridLines: surfaceSettings.gridLines,
        material: surfaceSettings.material,
        smoothShading: surfaceSettings.smoothShading,
        colorMapName: "Continuous",
    };
}
export function createSurfacePolygonsLayer(surfacePolygons: PolygonData_api[]): Record<string, unknown> {
    const features: Record<string, unknown>[] = surfacePolygons.map((polygon) => {
        return surfacePolygonsToGeojson(polygon);
    });
    const data: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    return {
        "@@type": "GeoJsonLayer",
        id: "surface-polygons-layer",
        data: data,
        opacity: 0.5,
        parameters: {
            depthTest: false,
        },
        pickable: true,
    };
}
function surfacePolygonsToGeojson(surfacePolygon: PolygonData_api): Record<string, unknown> {
    const data: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [zipCoords(surfacePolygon.x_arr, surfacePolygon.y_arr, surfacePolygon.z_arr)],
        },
        properties: { name: surfacePolygon.poly_id, color: [0, 0, 0, 255] },
    };
    return data;
}
export function createWellboreTrajectoryLayer(
    wellTrajectories: WellBoreTrajectory_api[],
    selectedWellBore: Wellbore | null
): Record<string, unknown> {
    const features: Record<string, unknown>[] = wellTrajectories.map((wellTrajectory) => {
        return wellTrajectoryToGeojson(wellTrajectory, selectedWellBore);
    });
    const data: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    console.log(data);
    return {
        "@@type": "WellsLayer",
        id: "wells-layer",
        data: data,
        refine: false,
        outline: false,
        lineStyle: { width: 4 },
        wellHeadStyle: { size: 1 },
        pickable: true,
    };
}
function wellTrajectoryToGeojson(
    wellTrajectory: WellBoreTrajectory_api,
    selectedWellBore: Wellbore | null
): Record<string, unknown> {
    const point: Record<string, unknown> = {
        type: "Point",
        coordinates: [wellTrajectory.easting_arr[0], wellTrajectory.northing_arr[0], -wellTrajectory.tvd_msl_arr[0]],
    };
    const coordinates: Record<string, unknown> = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.easting_arr, wellTrajectory.northing_arr, wellTrajectory.tvd_msl_arr),
    };
    const selectedUuid = selectedWellBore?.uuid;
    console.log(selectedUuid, wellTrajectory.wellbore_uuid === selectedUuid);
    const geometryCollection: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [point, coordinates],
        },
        properties: {
            uuid: wellTrajectory.wellbore_uuid,
            name: wellTrajectory.unique_wellbore_identifier,
            uwi: wellTrajectory.unique_wellbore_identifier,

            color: wellTrajectory.wellbore_uuid === selectedUuid ? [255, 0, 0, 255] : [0, 0, 0, 255],
            md: [wellTrajectory.md_arr],
        },
    };

    return geometryCollection;
}
export function createWellBoreHeaderLayer(wellTrajectories: WellBoreTrajectory_api[]): Record<string, unknown> {
    const data: Record<string, unknown>[] = wellTrajectories.map((wellTrajectory) => {
        return wellHeaderMarkerToGeojson(
            wellTrajectory.easting_arr[0],
            wellTrajectory.northing_arr[0],
            -wellTrajectory.tvd_msl_arr[0],
            wellTrajectory.unique_wellbore_identifier,
            wellTrajectory.wellbore_uuid
        );
    });

    return {
        "@@type": "TextLayer",
        id: "well-header-layer",
        data: data,
        getText: (d: Record<string, Record<string, string>>) => d.uwi,
        getPosition: (d: Record<string, number[]>) => d.coordinates,
        getSize: 12,
        getAngle: 0,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        pickable: true,
    };
}

function wellHeaderMarkerToGeojson(
    x: number,
    y: number,
    z: number,
    uwi: string,
    uuid: string
): Record<string, unknown> {
    // let data: Record<string, unknown> = {
    //     type: "Feature",
    //     geometry: {
    //         type: "Point",
    //         coordinates: [x, y, z],
    //     },
    //     properties: { name: label },
    // };
    const data: Record<string, unknown> = {
        coordinates: [x, y, z],
        uuid: uuid,
        uwi: uwi,
    };
    return data;
}

function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], -z_arr[i]]);
    }

    return coords;
}

import { GeoJsonLayer } from "@deck.gl/layers";
import type { SimulationWell_api } from "@api";

import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { Feature, LineString, Point } from "geojson";
import { SimulationWellSettings } from "../customDataProviderImplementations/SimulationWellProvider";

function getColor(object: Feature): [number, number, number, number] {
    if (object.properties && "color" in object.properties) {
        return object.properties.color as [number, number, number, number];
    }

    return [50, 50, 50, 1];
}
function getTooltip(object: Feature): any {
    console.log("getTooltip", object);
    if (object.properties && "name" in object.properties) {
        const content = ` <div>
          <h3>Feature Information</h3>
          <p><strong>ID:</strong> ${object.properties.uuid}</p>

        </div>`;
        return {
            html: content,
            style: {
                backgroundColor: "rgba(0, 50, 100, 0.85)",
                color: "#fff",
                padding: "10px",
                borderRadius: "5px",
                fontSize: "14px",
                maxWidth: "250px",
                border: "1px solid #00ffff",
            },
        };
    }
    return "No name available";
}
export function makeSimulationWellsLayer({
    id,
    name,
    getData,
    getSetting,
}: TransformerArgs<SimulationWellSettings, SimulationWell_api[]>): GeoJsonLayer | null {
    const data = getData();

    if (!data) {
        return null;
    }
    const jsonData = data.map((well: SimulationWell_api) => wellTrajectoryToGeojson(well));

    return new SimulationWellsLayer({
        id,
        name,
        data: jsonData,
        pickable: true,
        stroked: true,
        lineWidthMinPixels: 1,
        depthTest: false,
        getLineColor: getColor,
        getTooltip: getTooltip,
    });
}
function getFillColor() {
    return [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)];
}
function wellTrajectoryToGeojson(wellTrajectory: SimulationWell_api): any {
    const point: Point = {
        type: "Point",
        coordinates: [wellTrajectory.x_arr[0], wellTrajectory.y_arr[0], 0],
    };
    console.log(wellTrajectory.open_shut);
    const coordinates: LineString = {
        type: "LineString",
        coordinates: zipCoords(
            wellTrajectory.x_arr,
            wellTrajectory.y_arr,
            wellTrajectory.z_arr.map((z) => 0),
        ),
    };

    const lineWidth = 20;
    const wellHeadSize = 1;

    const geometryCollection: any = {
        type: "Feature",
        geometry: coordinates,

        properties: {
            uuid: wellTrajectory.well_name,
            name: wellTrajectory.well_name,
            uwi: wellTrajectory.well_name,
            color: getFillColor(),
            getTooltip: getTooltip,
            // make random color
            // getFillColor: getFillColor,
            // getLineColor: getFillColor,
            lineWidth,
            lineWidthMinPixels: 10,
            wellHeadSize,
        },
    };

    return geometryCollection;
}

function zipCoords(xArr: readonly number[], yArr: readonly number[], zArr: readonly number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < xArr.length; i++) {
        coords.push([xArr[i], yArr[i], -zArr[i]]);
    }

    return coords;
}
export type SimulationWellsLayerProps = {
    getTooltip: (d: Feature) => any;
    depthTest?: boolean;
};

export default class SimulationWellsLayer extends GeoJsonLayer<Feature, any> {
    renderLayers(): GeoJsonLayer<Feature>[] {
        const layer = new GeoJsonLayer<Feature>(
            this.getSubLayerProps({
                id: this.props.id,
                data: this.props.data,
                pickable: this.props.pickable,
                visible: this.props.visible,
                filled: this.props.filled,
                lineWidthMinPixels: this.props.lineWidthMinPixels,
                getTooltip: this.props.getTooltip,
                getLineColor: (d: Feature) => d?.properties?.["color"] ?? [0, 0, 0, 255],
                getFillColor: getColor,
                parameters: {
                    depthTest: this.props.depthTest,
                },
            }),
        );
        return [layer];
    }
}

import { ScatterplotLayer } from "@deck.gl/layers";
import { GL } from "@luma.gl/constants";
import type { Point3D } from "@webviz/subsurface-viewer";

import { HoverTopic } from "@framework/HoverService";
import { DEFAULT_WELLS_LAYER_PROPS } from "@modules/_shared/constants/wellsLayer";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";
import {
    makeDrilledWellTrajectoryFilterProps,
    wellDataToGeoJson,
} from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRichDrilledWellTrajectoriesLayer";
import type {
    HoverVisualizationFunctions,
    TransformerArgs,
    VisualizationTarget,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { getInterpolatedPositionAtMd } from "@modules/_shared/utils/wellbore";

function findWellboreTrajectory(uuid: string | null | undefined, trajectories: DrilledWellboreTrajectoriesData) {
    if (!uuid) return undefined;
    return trajectories.find(({ wellboreUuid }) => wellboreUuid === uuid);
}

export function makeDrilledWellTrajectoriesHoverVisualizationFunctions(
    args: TransformerArgs<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >,
): HoverVisualizationFunctions<VisualizationTarget.DECK_GL> {
    const { id, getData } = args;

    const wellboreTrajectories = getData();

    if (!wellboreTrajectories) {
        return {};
    }

    return {
        [HoverTopic.WELLBORE]: (wellboreUuid) => {
            const wellboreTrajectory = findWellboreTrajectory(wellboreUuid, wellboreTrajectories);
            const trajectoryData = wellboreTrajectory ? wellDataToGeoJson([wellboreTrajectory]) : null;

            return [
                new AdjustedWellsLayer({
                    ...DEFAULT_WELLS_LAYER_PROPS,
                    ...makeDrilledWellTrajectoryFilterProps(args),
                    id: `${id}-hovered-well`,
                    data: trajectoryData ?? {
                        type: "FeatureCollection",
                        features: [],
                    },
                    positionFormat: "XY",
                    lineWidthScale: 4,
                    outline: false,
                    lineStyle: {
                        ...DEFAULT_WELLS_LAYER_PROPS.lineStyle,
                        color: [255, 0, 0, 255],
                    },
                    wellHeadStyle: {
                        ...DEFAULT_WELLS_LAYER_PROPS.wellHeadStyle,
                        color: [255, 0, 0, 255],
                    },
                    pickable: false,
                    depthTest: false,
                    visible: trajectoryData !== null,
                    autoHighlight: false,
                }),
            ];
        },

        [HoverTopic.WELLBORE_MD]: (hoverData) => {
            const mdPointData: Point3D[] = [];
            if (hoverData?.md) {
                const wellboreTrajectory = findWellboreTrajectory(hoverData?.wellboreUuid, wellboreTrajectories);
                if (wellboreTrajectory) {
                    const interpolatedPosition = getInterpolatedPositionAtMd(hoverData.md, wellboreTrajectory);
                    interpolatedPosition[2] *= -1; // TVD value is positive, so we flip of for the actual z-position

                    mdPointData.push(interpolatedPosition);
                }
            }

            return [
                new ScatterplotLayer({
                    id: `${id}-hovered-md-point`,
                    data: mdPointData,
                    getRadius: 2,
                    radiusMinPixels: 8,
                    getLineWidth: 0.1,
                    lineWidthMinPixels: 1,
                    getFillColor: [255, 0, 0, 180],
                    getPosition: (d) => d,

                    stroked: true,
                    depthTest: false,
                    pickable: false,
                    billboard: true,
                    autoHighlight: false,
                    visible: mdPointData.length > 0,
                    parameters: { [GL.DEPTH_TEST]: false },
                }),
            ];
        },
    };
}

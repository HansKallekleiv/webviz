import { HoverTopic } from "@framework/HoverService";
import { BiconeLayer } from "@modules/3DViewer/customDeckGlLayers/BiconeLayer";
import { DEFAULT_WELLS_LAYER_PROPS } from "@modules/_shared/constants/wellsLayer";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesStoredData,
    DrilledWellboreTrajectoryData,
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
import {
    getInterpolatedNormalAtMd,
    getInterpolatedPositionAtMd,
    getTrajectoryIndexForMd,
} from "@modules/_shared/utils/wellbore";

function findWellboreTrajectory(uuid: string | null | undefined, trajectories: DrilledWellboreTrajectoriesData) {
    if (!uuid) return undefined;
    return trajectories.find(({ wellboreUuid }) => wellboreUuid === uuid);
}

const HOVERED_WELL_LINE_WIDTH_SCALE = 1.5;

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
                    positionFormat: "XYZ",
                    lineWidthScale: HOVERED_WELL_LINE_WIDTH_SCALE,
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
            const wellboreTrajectory = wellboreTrajectories.find(
                (wellTrajectory) => wellTrajectory.wellboreUuid === hoverData?.wellboreUuid,
            );

            let hoveredMdPoint3d: [number, number, number] = [0, 0, 0];
            let normal: [number, number, number] = [0, 0, 1];

            const visible = hoverData !== null && wellboreTrajectory !== undefined;

            if (visible) {
                const trajectoryIndex = getTrajectoryIndexForMd(hoverData.md, wellboreTrajectory);

                normal = getInterpolatedNormalAtMd(hoverData.md, wellboreTrajectory, trajectoryIndex);
                hoveredMdPoint3d = getInterpolatedPositionAtMd(
                    hoverData.md,
                    wellboreTrajectory as DrilledWellboreTrajectoryData,
                    trajectoryIndex,
                );
                hoveredMdPoint3d[2] *= -1; // Invert z-axis
            }

            return [
                new BiconeLayer({
                    id: `${id}-hovered-md-point`,
                    centerPoint: hoveredMdPoint3d,
                    radius: 20,
                    height: 10,
                    normalVector: normal,
                    numberOfSegments: 32,
                    color: [255, 0, 0],
                    opacity: 0.3,
                    visible: visible,
                    autoHighlight: false,
                    pickable: false,
                    sizeUnits: "pixels",
                    minSizeInMeters: 0,
                    maxSizeInMeters: 200,
                }),
            ];
        },
    };
}

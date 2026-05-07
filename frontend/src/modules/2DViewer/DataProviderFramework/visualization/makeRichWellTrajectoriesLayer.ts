import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import { LabelOrientation } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";

import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";
import { makeRichDrilledWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRichDrilledWellTrajectoriesLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makeRichWellTrajectoriesLayer(
    args: TransformerArgs<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >,
): WellsLayer | null {
    const wellboreTrajectoriesData = args.getData();

    return makeRichDrilledWellTrajectoriesLayer(args, {
        positionFormat: "XY",
        outline: false,
        pickable: false,
        depthTest: false,
        lineWidthScale: 2,
        showCompletionMarkers: true,
        showScreenTrajectoryAsDash: true,
        wellLabel: {
            // The label position is tied to the **entire** trajectory, so they look a bit out of place when filtering is applied. We might want to make sure the labels are hidden if `showFilterTrajectoryGhost` is false
            // visible: false
            orientation:
                wellboreTrajectoriesData && wellboreTrajectoriesData.length < 200
                    ? LabelOrientation.TANGENT
                    : LabelOrientation.HORIZONTAL,
            positionFormat: "XY",
            getPositionAlongPath: 1,
            getBackgroundColor: [255, 255, 255, 255 * 0.1],
            getTextAnchor: "end",
            getAlignmentBaseline: "top",
        },
    });
}

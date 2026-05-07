import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";
import { makeRichDrilledWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeRichDrilledWellTrajectoriesLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makeDrilledWellTrajectoriesLayer(
    args: TransformerArgs<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >,
) {
    return makeRichDrilledWellTrajectoriesLayer(args, {
        positionFormat: "XYZ",
        depthTest: true,
        outline: false,
        lineWidthScale: 1.5,
        defaultColor: [170, 170, 170, 220],
        showScreenTrajectoryAsDash: false,
    });
}

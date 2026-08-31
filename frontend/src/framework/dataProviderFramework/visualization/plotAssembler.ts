import type { RealizationTable } from "@framework/domain/RealizationTable";

import { DataProviderType } from "../dataProviders/dataProviderTypes";
import {
    InplaceVolumesProvider,
    type InplaceVolumesSettings,
    type InplaceVolumesStoredData,
} from "../dataProviders/implementations/InplaceVolumesProvider";
import {
    SummaryVectorHistoryProvider,
    SummaryVectorObservationsProvider,
} from "../dataProviders/implementations/SummaryVectorAuxiliaryProviders";
import { SummaryVectorProvider } from "../dataProviders/implementations/SummaryVectorProvider";
import { GroupType } from "../groups/groupTypes";
import { PlotView, type PlotViewSettings } from "../groups/implementations/PlotView";
import { Setting } from "../settings/settingsDefinitions";

import {
    accumulatePlotData,
    collectPlotGroup,
    type PlotAccumulatedData,
    type PlotGroupProduct,
} from "./plotCollector";
import {
    transformInplaceVolumesToPlot,
    transformSummaryVectorHistoryToPlot,
    transformSummaryVectorObservationToPlot,
    transformSummaryVectorToPlot,
} from "./plotTransformers";
import { PlotDimension } from "./plotTypes";
import { VisualizationAssembler } from "./VisualizationAssembler";
import type { GroupCustomPropsCollector, VisualizationTarget } from "./VisualizationAssembler";

export type PlotCustomGroupProps = {
    [GroupType.PLOT_VIEW]: PlotGroupProduct;
};

export type PlotAssemblerOptions = {
    categoricalPalette: readonly string[];
    ensembleColors?: Readonly<Record<string, string>>;
};

export function makePlotVisualizationAssembler(options: PlotAssemblerOptions) {
    const assembler = new VisualizationAssembler<
        VisualizationTarget.PLOT,
        PlotCustomGroupProps,
        Record<string, never>,
        PlotAccumulatedData
    >();

    assembler.registerDataProviderTransformers(DataProviderType.SUMMARY_VECTOR, SummaryVectorProvider, {
        transformToVisualization: transformSummaryVectorToPlot,
        reduceAccumulatedData: (accumulatedData, args) =>
            accumulatePlotData(accumulatedData, transformSummaryVectorToPlot(args)),
    });
    assembler.registerDataProviderTransformers(DataProviderType.SUMMARY_VECTOR_HISTORY, SummaryVectorHistoryProvider, {
        transformToVisualization: transformSummaryVectorHistoryToPlot,
        reduceAccumulatedData: (accumulatedData, args) =>
            accumulatePlotData(accumulatedData, transformSummaryVectorHistoryToPlot(args)),
    });
    assembler.registerDataProviderTransformers(
        DataProviderType.SUMMARY_VECTOR_OBSERVATIONS,
        SummaryVectorObservationsProvider,
        {
            transformToVisualization: transformSummaryVectorObservationToPlot,
            reduceAccumulatedData: (accumulatedData, args) =>
                accumulatePlotData(accumulatedData, transformSummaryVectorObservationToPlot(args)),
        },
    );
    assembler.registerDataProviderTransformers<InplaceVolumesSettings, RealizationTable, InplaceVolumesStoredData>(
        DataProviderType.INPLACE_VOLUMES,
        InplaceVolumesProvider,
        {
        transformToVisualization: transformInplaceVolumesToPlot,
        reduceAccumulatedData: (accumulatedData, args) => {
            const table = args.getData();
            return accumulatePlotData(
                accumulatedData,
                transformInplaceVolumesToPlot(args),
                table ?? undefined,
            );
        },
        },
    );

    const collectPlotView: GroupCustomPropsCollector<
        PlotViewSettings,
        GroupType.PLOT_VIEW,
        PlotCustomGroupProps,
        (typeof Setting.VISUALIZATION_KIND | typeof Setting.SUBPLOT_BY | typeof Setting.COLOR_BY),
        PlotAccumulatedData
    > = ({ getSetting, accumulatedData }) =>
        collectPlotGroup(accumulatedData, {
            visualizationKind: getSetting(Setting.VISUALIZATION_KIND)!,
            subplotBy: getSetting(Setting.SUBPLOT_BY) ?? PlotDimension.NONE,
            colorBy: getSetting(Setting.COLOR_BY) ?? PlotDimension.ENSEMBLE,
            categoricalPalette: options.categoricalPalette,
            ensembleColors: options.ensembleColors,
        });

    assembler.registerGroupCustomPropsCollector(GroupType.PLOT_VIEW, PlotView, collectPlotView);
    return assembler;
}
import { DataProviderType } from "@framework/dataProviderFramework/dataProviders/dataProviderTypes";
import { VisualizationKind } from "@framework/dataProviderFramework/dataProviders/visualizationKinds";
import { Setting } from "@framework/dataProviderFramework/settings/settingsDefinitions";

export enum ChartViewerMode {
    TIME_SERIES = "time-series",
    DISTRIBUTION = "distribution",
}

export type ChartViewerAction = {
    identifier: string;
    label: string;
};

export const PROVIDER_ACTIONS: Record<ChartViewerMode, readonly (ChartViewerAction & { type: DataProviderType })[]> = {
    [ChartViewerMode.TIME_SERIES]: [
        { identifier: "summary-vector", label: "Summary vector", type: DataProviderType.SUMMARY_VECTOR },
        { identifier: "summary-history", label: "Summary history", type: DataProviderType.SUMMARY_VECTOR_HISTORY },
        {
            identifier: "summary-observations",
            label: "Observations",
            type: DataProviderType.SUMMARY_VECTOR_OBSERVATIONS,
        },
    ],
    [ChartViewerMode.DISTRIBUTION]: [
        { identifier: "inplace-volumes", label: "In-place volumes", type: DataProviderType.INPLACE_VOLUMES },
    ],
};

/** The first kind is the default for a new chart. */
export const ALLOWED_VISUALIZATION_KINDS: Record<ChartViewerMode, readonly VisualizationKind[]> = {
    [ChartViewerMode.TIME_SERIES]: [VisualizationKind.TIME_SERIES],
    [ChartViewerMode.DISTRIBUTION]: [
        VisualizationKind.HISTOGRAM,
        VisualizationKind.BOX,
        VisualizationKind.BAR,
        VisualizationKind.CONVERGENCE,
        VisualizationKind.TABLE,
    ],
};

const COMMON_SETTING_ACTIONS = [
    { identifier: "ensemble", label: "Ensemble", setting: Setting.ENSEMBLE },
    { identifier: "realizations", label: "Realizations", setting: Setting.REALIZATIONS },
] as const;

export const SETTING_ACTIONS: Record<ChartViewerMode, readonly (ChartViewerAction & { setting: Setting })[]> = {
    [ChartViewerMode.TIME_SERIES]: [
        ...COMMON_SETTING_ACTIONS,
        { identifier: "vector-name", label: "Vector", setting: Setting.VECTOR_NAME },
        { identifier: "frequency", label: "Resampling frequency", setting: Setting.VECTOR_RESAMPLING_FREQUENCY },
        { identifier: "representation", label: "Representation", setting: Setting.REPRESENTATION },
    ],
    [ChartViewerMode.DISTRIBUTION]: [
        ...COMMON_SETTING_ACTIONS,
        { identifier: "grid", label: "Grid", setting: Setting.GRID_NAME },
        { identifier: "result", label: "Result", setting: Setting.INPLACE_RESULT },
        { identifier: "zone", label: "Zone", setting: Setting.ZONE },
        { identifier: "region", label: "Region", setting: Setting.REGION },
        { identifier: "facies", label: "Facies", setting: Setting.FACIES },
        { identifier: "license", label: "License", setting: Setting.LICENSE },
    ],
};
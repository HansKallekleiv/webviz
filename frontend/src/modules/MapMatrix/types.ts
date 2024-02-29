import { SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { SurfaceTimeType } from "@modules/_shared/Surface";
import { WellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

export enum SurfaceAttributeType {
    DEPTH_TIME = "Depth and time maps",
    STATIC_ATTRIBUTE = "Static attribute maps",
    TIMEPOINT_ATTRIBUTE = "Timepoint attribute maps",
    TIMEINTERVAL_ATTRIBUTE = "Timeinterval attribute maps",
}
export const SurfaceAttributeTypeToApi = {
    [SurfaceAttributeType.DEPTH_TIME]: [SurfaceAttributeType_api.DEPTH, SurfaceAttributeType_api.TIME],
    [SurfaceAttributeType.STATIC_ATTRIBUTE]: [
        SurfaceAttributeType_api.PROPERTY,
        SurfaceAttributeType_api.ISOCHORE,
        SurfaceAttributeType_api.FLUID_CONTACT,
        SurfaceAttributeType_api.THICKNESS,
    ],
    [SurfaceAttributeType.TIMEPOINT_ATTRIBUTE]: [
        SurfaceAttributeType_api.PROPERTY,
        SurfaceAttributeType_api.SEISMIC,
        SurfaceAttributeType_api.ISOCHORE,
        SurfaceAttributeType_api.FLUID_CONTACT,
        SurfaceAttributeType_api.THICKNESS,
    ],
    [SurfaceAttributeType.TIMEINTERVAL_ATTRIBUTE]: [
        SurfaceAttributeType_api.PROPERTY,
        SurfaceAttributeType_api.SEISMIC,
        SurfaceAttributeType_api.ISOCHORE,
        SurfaceAttributeType_api.FLUID_CONTACT,
        SurfaceAttributeType_api.THICKNESS,
    ],
};
export const StatisticFunctionToStringMapping = {
    [SurfaceStatisticFunction_api.MEAN]: "Mean",
    [SurfaceStatisticFunction_api.MIN]: "Min",
    [SurfaceStatisticFunction_api.MAX]: "Max",
    [SurfaceStatisticFunction_api.STD]: "StdDev",
    [SurfaceStatisticFunction_api.P10]: "P10",
    [SurfaceStatisticFunction_api.P50]: "P50",
    [SurfaceStatisticFunction_api.P90]: "P90",
};
export type SurfaceReducerState = {
    ensembleIdents: EnsembleIdent[];
    viewSpecifications: ViewSpecification[];
    wellsSpecification: WellsSpecification;
    syncedSettings: SyncedSettings;
    timeMode: SurfaceTimeType;
    attributeType: SurfaceAttributeType;
};

export type ViewSpecification = {
    ensembleIdent: EnsembleIdent | null;
    surfaceName: string | null;
    surfaceAttribute: string | null;
    surfaceTimeOrInterval: string | null;
    realizationNum: number | null;
    realizationNumsStatistics: number[];
    uuid: string;
    statisticFunction: SurfaceStatisticFunction_api;
    ensembleStage: EnsembleStageType;
    colorRange: [number, number] | null;
    colorPaletteId: string | null;
};
export type WellsSpecification = {
    smdaWellBoreAddresses: WellBoreAddress[];
    useFilterTvdAbove: boolean;
    useFilterTvdBelow: boolean;
    filterTvdAbove: number;
    filterTvdBelow: number;
    showWellNames: boolean;
    showWellTrajectories: boolean;
    showWellMarkers: boolean;
};
export type SyncedSettings = {
    ensemble: boolean;
    name: boolean;
    attribute: boolean;
    timeOrInterval: boolean;
    realizationNum: boolean;
    colorRange: boolean;
    colorPaletteId: boolean;
};

export enum EnsembleStageType {
    Statistics = "Statistics",
    Realization = "Realization",
    Observation = "Observation",
}

export type EnsembleStatisticStage = {
    ensembleStage: EnsembleStageType.Statistics;
    statisticFunction: SurfaceStatisticFunction_api;
    realizationNums: number[];
};

export type EnsembleRealizationStage = {
    ensembleStage: EnsembleStageType.Realization;
    realizationNum: number;
};
export type EnsembleObservationStage = {
    ensembleStage: EnsembleStageType.Observation;
    realizationNum?: number; // The observation might be tied to a realization (e.g., depth converted)
};

export type EnsembleStage = EnsembleStatisticStage | EnsembleRealizationStage | EnsembleObservationStage;

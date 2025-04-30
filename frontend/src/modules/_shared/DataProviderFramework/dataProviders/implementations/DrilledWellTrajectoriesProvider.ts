import {
    FlowVector_api,
    GetWellboreCompletionsSmdaData_api,
    WellFlowData_api,
    WellboreCompletionSmda_api,
    getWellboreSurveysOptions,
} from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getFlowDataInTimeIntervalOptions,
    getFlowDataInfoOptions,
    getWellboreCompletionsSmdaOptions,
} from "@api";
import { Completion } from "@equinor/esv-intersection";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { isEqual } from "lodash";

import { WellSurveyCollection } from "./utils/WellSurvey";

import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "../../interfacesAndTypes/customSettingsHandler";

const drilledWellTrajectoriesSettings = [
    Setting.ENSEMBLE,
    Setting.SMDA_WELLBORE_HEADERS,
    Setting.FLOW_TYPES,
    Setting.DATE_RANGE,
    Setting.COMPLETION_TYPES,
] as const;
type DrilledWellTrajectoriesSettings = typeof drilledWellTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<DrilledWellTrajectoriesSettings>;

export enum FlowType {
    OIL_PROD = "OIL_PROD",
    GAS_PROD = "GAS_PROD",
    WATER_PROD = "WATER_PROD",
    WATER_INJ = "WATER_INJ",
    GAS_INJ = "GAS_INJ",
    OIL_INJ = "OIL_INJ",
}
export enum CompletionType {
    NONE = "None",
    PERFORATION = "perforation",
    OPEN_HOLE_GRAVEL_PACK = "open hole gravel pack",
    OPEN_HOLE_SCREEN = "open hole screen",
}
export type WellTrajectoryData = {
    wellboreUuid: string;
    uniqueWellboreIdentifier: string;
    tvdMslArr: Array<number>;
    mdArr: Array<number>;
    eastingArr: Array<number>;
    northingArr: Array<number>;
    completionArr: Array<CompletionType>;
    flowType: FlowType | null;
};
// export type WellTrajectoryHeader = {
//     easting: number;
//     northing: number;
//     tvd: number;
//     rkb?: number;
// };
// export type WellTrajectorySegment = {
//     eastingArr: Array<number>;
//     northingArr: Array<number>;
//     mdArr: Array<number>;
//     tvdMslArr: Array<number>;
//     completionType: CompletionType;
// };
// export type WellTrajectoryData = {
//     wellboreUuid: string;
//     uniqueWellboreIdentifier: string;
//     uniqueWellIdentifier: string;
//     wellhead: WellTrajectoryHeader;
//     trajectorySegments: WellTrajectorySegment[];
//     flowType: FlowType | null;
// };
export class DrilledWellTrajectoriesProvider
    implements CustomDataProviderImplementation<DrilledWellTrajectoriesSettings, WellTrajectoryData[]>
{
    settings = drilledWellTrajectoriesSettings;

    getDefaultName() {
        return "Drilled Well Trajectories";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,

        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<DrilledWellTrajectoriesSettings, WellTrajectoryData[]>): Promise<WellTrajectoryData[]> {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        // const realizationNum = getSetting(Setting.REALIZATION);
        const dateRange = getSetting(Setting.DATE_RANGE) ?? [0, 0];
        const startTimestamp = dateRange[0];
        const endTimestamp = dateRange[1];
        const flowVectors = getSetting(Setting.FLOW_TYPES);
        const completionTypes = getSetting(Setting.COMPLETION_TYPES);

        const surveyPromise = queryClient.fetchQuery({
            ...getWellboreSurveysOptions({
                query: { field_identifier: fieldIdentifier ?? "" },
            }),
        });
        const completionPromise = queryClient.fetchQuery({
            ...getWellboreCompletionsSmdaOptions({
                query: {
                    field_identifier: fieldIdentifier ?? "",
                },
            }),
        });
        const wellFlowDataPromise = queryClient.fetchQuery({
            ...getFlowDataInTimeIntervalOptions({
                query: {
                    field_identifier: fieldIdentifier ?? "",
                    case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                    ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                    start_timestamp_utc_ms: startTimestamp,
                    end_timestamp_utc_ms: endTimestamp,
                    // flow_vectors: flowVectors as FlowVector_api[],
                    realization: 1,
                    volume_limit: 0,
                },
            }),
            staleTime: 1800000,
            gcTime: 1800000,
        });
        return Promise.all([surveyPromise, wellFlowDataPromise, completionPromise]).then(
            ([surveyData, wellFlowData, completionData]) => {
                const surveyCollection = new WellSurveyCollection(surveyData);
                const flowDataArr = wellFlowData as WellFlowData_api[];

                if (flowVectors.length > 0) {
                    surveyCollection.filterOnFlowTypes(flowDataArr, flowVectors as FlowVector_api[]);
                }

                if (completionTypes.length > 0) {
                    surveyCollection.filterOnCompletions(
                        completionData,
                        completionTypes as CompletionType[],
                        null,
                        null,
                    );
                }
                const wellData = surveyCollection.getData();

                return wellData;
            },
        );
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<DrilledWellTrajectoriesSettings>) {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const fieldIdentifier = ensemble.getFieldIdentifier();

            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier },
                    signal: abortSignal,
                }),
            });
        });
        const flowDataInfoDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);

            if (!ensemble) {
                return null;
            }

            const fieldIdentifier = ensemble.getFieldIdentifier();

            return await queryClient.fetchQuery({
                ...getFlowDataInfoOptions({
                    query: {
                        field_identifier: fieldIdentifier,
                        case_uuid: ensemble.getCaseUuid(),
                        ensemble_name: ensemble.getEnsembleName(),
                    },
                    signal: abortSignal,
                }),
            });
        });
        const completionDataDep = helperDependency(async function fetchData({ getLocalSetting, abortSignal }) {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            if (!ensembleIdent) {
                return null;
            }
            const ensembleSet = workbenchSession.getEnsembleSet();
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (!ensemble) {
                return null;
            }
            const fieldIdentifier = ensemble.getFieldIdentifier();
            return await queryClient.fetchQuery({
                ...getWellboreCompletionsSmdaOptions({
                    query: {
                        field_identifier: fieldIdentifier,
                    },
                    signal: abortSignal,
                }),
            });
        });
        availableSettingsUpdater(Setting.SMDA_WELLBORE_HEADERS, ({ getHelperDependency }) => {
            const wellboreHeaders = getHelperDependency(wellboreHeadersDep);

            if (!wellboreHeaders) {
                return [];
            }

            return wellboreHeaders;
        });
        availableSettingsUpdater(Setting.FLOW_TYPES, ({ getHelperDependency }) => {
            const flowDataInfo = getHelperDependency(flowDataInfoDep);

            if (!flowDataInfo) {
                return [];
            }

            return flowDataInfo.flow_vectors;
        });

        availableSettingsUpdater(Setting.DATE_RANGE, ({ getHelperDependency }) => {
            const flowDataInfo = getHelperDependency(flowDataInfoDep);

            if (!flowDataInfo) {
                return [0, 0];
            }

            return [flowDataInfo.start_timestamp_utc_ms, flowDataInfo.end_timestamp_utc_ms];
        });
        availableSettingsUpdater(Setting.COMPLETION_TYPES, ({ getHelperDependency }) => {
            const completionData = getHelperDependency(completionDataDep);

            if (!completionData) {
                return [];
            }
            const completionTypes = completionData.map((completion) => {
                return completion.completionType;
            });
            return [...new Set(completionTypes)];
        });
    }
}

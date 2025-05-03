import {
    FlowVector_api,
    GetWellboreCompletionsSmdaData_api,
    WellFlowData_api,
    WellboreCompletionSmda_api,
    WellborePick_api,
    WellboreStratigraphicUnitEntryExitMd_api,
    WellboreSurvey_api,
    getMdPairsForStratigraphicUnitInWellboresOptions,
    getStratigraphicUnitsOptions,
    getWellborePicksForPickIdentifierOptions,
    getWellboreSurveysOptions,
} from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getFlowDataInTimeIntervalOptions,
    getFlowDataInfoOptions,
    getWellboreCompletionsSmdaOptions,
} from "@api";
import { Completion, IntersectionReferenceSystem } from "@equinor/esv-intersection";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { isEqual } from "lodash";

import { WellSurveyCollection } from "./utils/WellSurvey";
import {
    WellTrajectorySegment,
    createReferenceSystem,
    filterDataByFlow,
    segmentDataByCompletionAndStratigraphy,
    transformSurveyData,
} from "./utils/WellTrajectories";

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
    implements CustomDataProviderImplementation<DrilledWellTrajectoriesSettings, WellTrajectorySegment[]>
{
    settings = drilledWellTrajectoriesSettings;

    getDefaultName() {
        return "Drilled Well Trajectories";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }
    async fetchData({
        getSetting,
        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<DrilledWellTrajectoriesSettings, WellTrajectorySegment[]>): Promise<WellTrajectorySegment[]> {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const ensembles = getGlobalSetting("ensembles");

        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const ensemble = ensembles.find((e) => e.getIdent() === ensembleIdent);
        const stratColumn = ensemble?.getStratigraphicColumnIdentifier();
        const dateRange = getSetting(Setting.DATE_RANGE) ?? [0, 0];
        const startTimestamp = dateRange[0];
        const endTimestamp = dateRange[1];
        const flowVectors = getSetting(Setting.FLOW_TYPES);
        const completionTypes = getSetting(Setting.COMPLETION_TYPES);
        const wellboreHeaders = getSetting(Setting.SMDA_WELLBORE_HEADERS);

        const surveyPromise = queryClient.fetchQuery({
            ...getWellboreSurveysOptions({ query: { field_identifier: fieldIdentifier ?? "" } }),
        });
        const completionPromise = queryClient.fetchQuery({
            ...getWellboreCompletionsSmdaOptions({ query: { field_identifier: fieldIdentifier ?? "" } }),
        });
        const wellFlowDataPromise = queryClient.fetchQuery({
            ...getFlowDataInTimeIntervalOptions({
                query: {
                    field_identifier: fieldIdentifier ?? "",
                    case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                    ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                    start_timestamp_utc_ms: startTimestamp,
                    end_timestamp_utc_ms: endTimestamp,
                    realization: 1,
                    volume_limit: 0,
                },
            }),
            staleTime: 1800000,
            gcTime: 1800000,
        });
        let wellStratUnitEntryExitPromise: Promise<WellboreStratigraphicUnitEntryExitMd_api[]>;
        if (true) {
            //todo
            wellStratUnitEntryExitPromise = queryClient.fetchQuery({
                ...getMdPairsForStratigraphicUnitInWellboresOptions({
                    query: {
                        field_identifier: fieldIdentifier ?? "",
                        strat_column_identifier: stratColumn ?? "",
                        stratigraphic_unit_identifier: "Aasgard Fm.",
                    },
                }),
            });
        } else {
            wellStratUnitEntryExitPromise = Promise.resolve([]);
        }
        const [surveyData, wellFlowData, completionData, wellStratUnitEntryExitData] = await Promise.all([
            surveyPromise,
            wellFlowDataPromise,
            completionPromise,
            wellStratUnitEntryExitPromise,
        ]);

        const selectedWellboreUuids = new Set(wellboreHeaders?.map((h) => h.wellboreUuid) ?? []);

        const filteredSurveyData = surveyData.filter((survey) => selectedWellboreUuids.has(survey.wellboreUuid));

        const filteredStratUnitEntryExitData = wellStratUnitEntryExitData.filter((entryExit) => {
            return selectedWellboreUuids.has(entryExit.wellboreUuid);
        });
        const filteredCompletionData = completionData.filter(
            (comp) => comp.wellboreUuid && selectedWellboreUuids.has(comp.wellboreUuid),
        );
        const filteredWellFlowData = wellFlowData.filter((flow) => {
            // Adjust this logic based on how wellFlowData links to wellbores (e.g., UWI, UUID)
            // This example assumes flow.well_uwi links to header.uniqueWellboreIdentifier
            const header = wellboreHeaders?.find((h) => h.uniqueWellboreIdentifier === flow.well_uwi);
            return header?.wellboreUuid && selectedWellboreUuids.has(header.wellboreUuid);
        });
        // --- Process Strat Data into a Map ---
        const stratIntervalsByWellbore = new Map<string, Array<{ entryMd: number; exitMd: number }>>();
        filteredStratUnitEntryExitData.forEach((item) => {
            if (!stratIntervalsByWellbore.has(item.wellboreUuid)) {
                stratIntervalsByWellbore.set(item.wellboreUuid, []);
            }
            // Add valid intervals
            if (item.entryMd != null && item.exitMd != null && item.entryMd <= item.exitMd) {
                stratIntervalsByWellbore.get(item.wellboreUuid)?.push({ entryMd: item.entryMd, exitMd: item.exitMd });
            }
        });
        // Optional: Sort intervals for potentially faster checking later
        stratIntervalsByWellbore.forEach((intervals) => intervals.sort((a, b) => a.entryMd - b.entryMd));

        const intermediateData: WellTrajectoryData[] = transformSurveyData(filteredSurveyData);

        const refSystemMap = new Map<string, IntersectionReferenceSystem>();
        intermediateData.forEach((wd) => {
            if (wd.wellboreUuid) {
                const refSystem = createReferenceSystem(wd);
                if (refSystem) {
                    refSystemMap.set(wd.wellboreUuid, refSystem);
                }
            }
        });

        let filteredIntermediateData = intermediateData;
        if (flowVectors.length > 0) {
            filteredIntermediateData = filterDataByFlow(
                intermediateData,
                filteredWellFlowData,
                flowVectors as FlowVector_api[], // Assuming FlowVector_api type exists
            );
        }

        const dataForSegmentation: Array<{ wellData: WellTrajectoryData; refSystem: IntersectionReferenceSystem }> = [];
        filteredIntermediateData.forEach((wellData) => {
            if (wellData.wellboreUuid && refSystemMap.has(wellData.wellboreUuid)) {
                dataForSegmentation.push({
                    wellData: wellData,
                    refSystem: refSystemMap.get(wellData.wellboreUuid)!,
                });
            }
        });

        const startDateStr = startTimestamp ? new Date(startTimestamp).toISOString() : null;
        const endDateStr = endTimestamp ? new Date(endTimestamp).toISOString() : null;

        // *** Call the updated segmentation function, passing the strat intervals map ***
        const finalSegmentData = segmentDataByCompletionAndStratigraphy(
            dataForSegmentation,
            filteredCompletionData, // Use filtered completion data
            stratIntervalsByWellbore, // Pass the processed strat intervals
            completionTypes as CompletionType[],
            startDateStr,
            endDateStr,
        );

        return finalSegmentData;

        // Potentially process/merge filteredPicks into finalSegmentData here if required

        return finalSegmentData;
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

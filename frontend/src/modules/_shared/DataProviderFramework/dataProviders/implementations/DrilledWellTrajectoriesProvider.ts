import type { FlowVector_api, WellFlowData_api, WellboreTrajectory_api } from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getFlowDataInTimeIntervalOptions,
    getFlowDataInfoOptions,
    getWellTrajectoriesOptions,
} from "@api";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { isEqual } from "lodash";

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
] as const;
type DrilledWellTrajectoriesSettings = typeof drilledWellTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<DrilledWellTrajectoriesSettings>;

export type DrilledWellData = { trajectoryData: WellboreTrajectory_api[]; wellFlowData: WellFlowData_api[] };
export enum FlowType {
    OIL_PROD = "OIL_PROD",
    GAS_PROD = "GAS_PROD",
    WATER_PROD = "WATER_PROD",
    WATER_INJ = "WATER_INJ",
    GAS_INJ = "GAS_INJ",
    OIL_INJ = "OIL_INJ",
}
export type DrilledWellDataWithFlowTypes = {
    trajectoryData: WellboreTrajectory_api;
    flowType: FlowType | null;
};

export class DrilledWellTrajectoriesProvider
    implements CustomDataProviderImplementation<DrilledWellTrajectoriesSettings, DrilledWellDataWithFlowTypes[]>
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
    }: FetchDataParams<DrilledWellTrajectoriesSettings, DrilledWellDataWithFlowTypes[]>): Promise<
        DrilledWellDataWithFlowTypes[]
    > {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        // const realizationNum = getSetting(Setting.REALIZATION);
        const dateRange = getSetting(Setting.DATE_RANGE) ?? [0, 0];
        const startTimestamp = dateRange[0];
        const endTimestamp = dateRange[1];
        const flowVectors = getSetting(Setting.FLOW_TYPES);
        const queryKey = ["getWellTrajectories", fieldIdentifier];
        registerQueryKey(queryKey);

        const trajectoryPromise = queryClient.fetchQuery({
            ...getWellTrajectoriesOptions({
                query: { field_identifier: fieldIdentifier ?? "" },
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
                    realization: 0,
                    volume_limit: 0,
                },
            }),
            staleTime: 1800000,
            gcTime: 1800000,
        });
        return Promise.all([trajectoryPromise, wellFlowDataPromise]).then(([trajectoryData, wellFlowData]) => {
            const flowVectors = getSetting(Setting.FLOW_TYPES);
            // Filter out trajectories that are not in the flow data
            const wellData: DrilledWellDataWithFlowTypes[] = [];
            wellFlowData.forEach((flowData) => {
                const trajectory = trajectoryData.find(
                    (trajectory) => trajectory.uniqueWellboreIdentifier === flowData.well_uwi,
                );
                if (!trajectory) {
                    return null;
                }
                if (!flowVectors || flowVectors.length === 0) {
                    wellData.push({
                        trajectoryData: trajectory,
                        flowType: null,
                    });
                    return;
                }
                let flowType: FlowType | null = null;
                if (
                    flowVectors.includes("oil_production") &&
                    flowData.oil_production_volume &&
                    flowData.oil_production_volume > 0
                ) {
                    flowType = FlowType.OIL_PROD;
                } else if (
                    flowVectors.includes("gas_production") &&
                    flowData.gas_production_volume &&
                    flowData.gas_production_volume > 0
                ) {
                    flowType = FlowType.GAS_PROD;
                } else if (flowData.water_production_volume && flowData.water_production_volume > 0) {
                    flowType = FlowType.WATER_PROD;
                }
                if (flowType) {
                    wellData.push({
                        trajectoryData: trajectory,
                        flowType: flowType,
                    });
                }
            });
            const filteredTrajectoryData = trajectoryData.filter((trajectory) =>
                wellFlowData.some((flowData) => flowData.well_uwi === trajectory.uniqueWellboreIdentifier),
            );
            console.log("Filtered Trajectory Data", filteredTrajectoryData.length);
            return wellData;
        });
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
    }
}

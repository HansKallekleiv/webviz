import { isEqual } from "lodash";

import type { SimulationWell_api, WellboreTrajectory_api } from "@api";
import {
    getDrilledWellboreHeadersOptions,
    getSimulationGridWellboreGeometries,
    getSimulationGridWellboreGeometriesOptions,
    getWellTrajectoriesOptions,
} from "@api";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";

const simulationWellSettings = [Setting.ENSEMBLE, Setting.REALIZATION] as const;
export type SimulationWellSettings = typeof simulationWellSettings;
type SettingsWithTypes = MakeSettingTypesMap<SimulationWellSettings>;

type SimulationWellData = SimulationWell_api[];

export class SimulationWellProvider
    implements CustomDataProviderImplementation<SimulationWellSettings, SimulationWellData>
{
    settings = simulationWellSettings;

    getDefaultName() {
        return "Simulation Wells";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        registerQueryKey,
        queryClient,
    }: FetchDataParams<SimulationWellSettings, SimulationWellData>): Promise<SimulationWellData> {
        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realizationNum = getSetting(Setting.REALIZATION);

        const queryOptions = getSimulationGridWellboreGeometriesOptions({
            query: {
                case_uuid: ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: ensembleIdent?.getEnsembleName() ?? "",
                realization_num: realizationNum ?? 0,
            },
        });

        const promise = queryClient.fetchQuery({
            ...queryOptions,
        });

        return promise;
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        workbenchSession,
        queryClient,
    }: DefineDependenciesArgs<SimulationWellSettings>) {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        availableSettingsUpdater(Setting.REALIZATION, ({ getLocalSetting, getGlobalSetting }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);
            const realizationFilterFunc = getGlobalSetting("realizationFilterFunction");

            if (!ensembleIdent) {
                return [];
            }

            const realizations = realizationFilterFunc(ensembleIdent);

            return [...realizations];
        });
    }
}

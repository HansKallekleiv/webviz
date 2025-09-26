import { isEqual } from "lodash";

import type { WellboreTrajectory_api } from "@api";
import { getDrilledWellboreHeadersOptions, getObservedSurfacesMetadataOptions, getWellTrajectoriesOptions } from "@api";
import type {
    CustomDataProviderImplementation,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

const richDrilledWellTrajectoriesSettings = [
    Setting.ENSEMBLE,
    Setting.SMDA_WELLBORE_HEADERS,
    // Setting.WELLBORE_PERFORATIONS,
    Setting.TIME_OR_INTERVAL,
    Setting.DEPTH_FILTER,
] as const;
type RichDrilledWellTrajectoriesSettings = typeof richDrilledWellTrajectoriesSettings;
type SettingsWithTypes = MakeSettingTypesMap<RichDrilledWellTrajectoriesSettings>;

type RichDrilledWellTrajectoriesData = WellboreTrajectory_api[];

export class RichDrilledWellTrajectoriesProvider
    implements CustomDataProviderImplementation<RichDrilledWellTrajectoriesSettings, RichDrilledWellTrajectoriesData>
{
    settings = richDrilledWellTrajectoriesSettings;

    getDefaultName() {
        return "Rich Drilled Well Trajectories";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fetchData({
        getSetting,
        getGlobalSetting,
        fetchQuery,
    }: FetchDataParams<
        RichDrilledWellTrajectoriesSettings,
        RichDrilledWellTrajectoriesData
    >): Promise<RichDrilledWellTrajectoriesData> {
        const fieldIdentifier = getGlobalSetting("fieldId");
        const selectedWellboreHeaders = getSetting(Setting.SMDA_WELLBORE_HEADERS);
        let selectedWellboreUuids: string[] = [];
        if (selectedWellboreHeaders) {
            selectedWellboreUuids = selectedWellboreHeaders.map((header) => header.wellboreUuid);
        }

        const queryOptions = getWellTrajectoriesOptions({
            query: { field_identifier: fieldIdentifier ?? "" },
        });

        const promise = fetchQuery({
            ...queryOptions,
            staleTime: 1800000, // TODO: Both stale and gcTime are set to 30 minutes for now since SMDA is quite slow for fields with many wells - this should be adjusted later
            gcTime: 1800000,
        }).then((response: RichDrilledWellTrajectoriesData) => {
            return response.filter((trajectory) => selectedWellboreUuids.includes(trajectory.wellboreUuid));
        });

        return promise;
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        queryClient,
    }: DefineDependenciesArgs<RichDrilledWellTrajectoriesSettings>) {
        availableSettingsUpdater(Setting.ENSEMBLE, ({ getGlobalSetting }) => {
            const fieldIdentifier = getGlobalSetting("fieldId");
            const ensembles = getGlobalSetting("ensembles");

            const ensembleIdents = ensembles
                .filter((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier)
                .map((ensemble) => ensemble.getIdent());

            return ensembleIdents;
        });

        const wellboreHeadersDep = helperDependency(async function fetchData({ getGlobalSetting, abortSignal }) {
            const fieldIdentifier = getGlobalSetting("fieldId");
            return await queryClient.fetchQuery({
                ...getDrilledWellboreHeadersOptions({
                    query: { field_identifier: fieldIdentifier ?? "" },
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

        // const perforationsDep = helperDependency(async ({ getGlobalSetting, abortSignal }) => {
        //     const fieldIdentifier = getGlobalSetting("fieldId");
        //     return await queryClient.fetchQuery({
        //         ...getFieldPerforationsOptions({
        //             query: { field_identifier: fieldIdentifier ?? "" },
        //             signal: abortSignal,
        //         }),
        //     });
        // });
        // const screenDep = helperDependency(async ({ getGlobalSetting, abortSignal }) => {
        //     const fieldIdentifier = getGlobalSetting("fieldId");
        //     return await queryClient.fetchQuery({
        //         ...getFieldScreensOptions({
        //             query: { field_identifier: fieldIdentifier ?? "" },
        //             signal: abortSignal,
        //         }),
        //     });
        // });
        // availableSettingsUpdater(Setting.WELLBORE_PERFORATIONS, ({ getHelperDependency }) => {
        //     const perforations = getHelperDependency(perforationsDep);

        //     if (!perforations) {
        //         return [];
        //     }
        //     // flat map to array of strings
        //     return Array.from(new Set(perforations.flatMap((perforation) => perforation.status)));
        // });
        const observedSurfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getObservedSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                    },
                    signal: abortSignal,
                }),
            });
        });
        availableSettingsUpdater(Setting.TIME_OR_INTERVAL, ({ getHelperDependency }) => {
            const data = getHelperDependency(observedSurfaceMetadataDep);
            if (!data) {
                return [];
            }

            return data.time_intervals_iso_str;
        });
    }
}

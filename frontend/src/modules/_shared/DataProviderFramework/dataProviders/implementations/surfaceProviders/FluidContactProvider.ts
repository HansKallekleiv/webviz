import { isEqual } from "lodash";

import { getFluidContactSurfacesMetadataOptions, getSurfaceDataOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { sortStringArray } from "@lib/utils/arrays";
import type {
    CustomDataProviderImplementation,
    DataProviderInformationAccessors,
    FetchDataParams,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { DefineDependenciesArgs } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { SurfaceAddressBuilder, type FullSurfaceAddress } from "@modules/_shared/Surface";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import { createEnsembleUpdater, createRealizationUpdater } from "./_commonSettingsUpdaters";
import { SurfaceDataFormat, type SurfaceData, type SurfaceStoredData } from "./types";

const surfaceSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATION,
    Setting.FLUID_CONTACT,
    Setting.SURFACE_NAME,
    Setting.DEPTH_COLOR_SCALE,
    Setting.CONTOURS,
] as const;
export type FluidContactSurfaceSettings = typeof surfaceSettings;
type SettingsWithTypes = MakeSettingTypesMap<FluidContactSurfaceSettings>;

const FLUID_CONTACT_STANDARD_RESULT_ATTRIBUTE = "fluid_contact_surface (standard result)";

export class FluidContactProvider
    implements CustomDataProviderImplementation<FluidContactSurfaceSettings, SurfaceData, SurfaceStoredData>
{
    settings = surfaceSettings;

    private _dataFormat: SurfaceDataFormat = SurfaceDataFormat.FLOAT;

    getDefaultSettingsValues() {
        return {};
    }

    getDefaultName(): string {
        return "Fluid Contact Surface";
    }

    doSettingsChangesRequireDataRefetch(prevSettings: SettingsWithTypes, newSettings: SettingsWithTypes): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    makeValueRange({
        getData,
    }: DataProviderInformationAccessors<FluidContactSurfaceSettings, SurfaceData, SurfaceStoredData>):
        | [number, number]
        | null {
        const data = getData()?.surfaceData;
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    defineDependencies({
        helperDependency,
        availableSettingsUpdater,
        storedDataUpdater,
        queryClient,
    }: DefineDependenciesArgs<FluidContactSurfaceSettings, SurfaceStoredData>) {
        availableSettingsUpdater(Setting.ENSEMBLE, createEnsembleUpdater());

        const surfaceMetadataDep = helperDependency(async ({ getLocalSetting, abortSignal }) => {
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return null;
            }

            return await queryClient.fetchQuery({
                ...getFluidContactSurfacesMetadataOptions({
                    query: {
                        case_uuid: ensembleIdent.getCaseUuid(),
                        ensemble_name: ensembleIdent.getEnsembleName(),
                        ...makeCacheBustingQueryParam(ensembleIdent),
                    },
                    signal: abortSignal,
                }),
            });
        });
        availableSettingsUpdater(Setting.REALIZATION, createRealizationUpdater());
        availableSettingsUpdater(Setting.FLUID_CONTACT, ({ getHelperDependency }) => {
            const data = getHelperDependency(surfaceMetadataDep);

            if (!data) {
                return [];
            }

            const availableFluidContacts = [...Array.from(new Set(data.surfaces.map((surface) => surface.contact)))];

            return availableFluidContacts;
        });
        availableSettingsUpdater(Setting.SURFACE_NAME, ({ getHelperDependency, getLocalSetting }) => {
            const fluidContact = getLocalSetting(Setting.FLUID_CONTACT);
            const data = getHelperDependency(surfaceMetadataDep);

            if (!fluidContact || !data) {
                return [];
            }

            const availableSurfaceNames = [
                ...Array.from(
                    new Set(data.surfaces.filter((surface) => surface.contact === fluidContact).map((el) => el.name)),
                ),
            ];
            return sortStringArray(availableSurfaceNames, data.surface_names_in_strat_order);
        });

        storedDataUpdater("realizations", ({ getGlobalSetting, getLocalSetting }) => {
            const filterFunction = getGlobalSetting("realizationFilterFunction");
            const ensembleIdent = getLocalSetting(Setting.ENSEMBLE);

            if (!ensembleIdent) {
                return [];
            }

            return filterFunction(ensembleIdent);
        });
    }

    fetchData(params: FetchDataParams<FluidContactSurfaceSettings, SurfaceData>): Promise<SurfaceData> {
        const { getSetting, fetchQuery } = params;

        const ensembleIdent = getSetting(Setting.ENSEMBLE);
        const realization = getSetting(Setting.REALIZATION);
        const surfaceName = getSetting(Setting.SURFACE_NAME);
        const fluidContact = getSetting(Setting.FLUID_CONTACT);

        let surfaceAddress: FullSurfaceAddress | null = null;
        if (ensembleIdent && surfaceName && fluidContact != null && realization != null) {
            const addrBuilder = new SurfaceAddressBuilder();
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(FLUID_CONTACT_STANDARD_RESULT_ATTRIBUTE);
            addrBuilder.withContact(fluidContact);
            addrBuilder.withRealization(realization);

            surfaceAddress = addrBuilder.buildRealizationAddress();
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const surfaceDataOptions = getSurfaceDataOptions({
            query: {
                surf_addr_str: surfAddrStr ?? "",
                data_format: this._dataFormat,
                resample_to_def_str: null,
                ...makeCacheBustingQueryParam(surfaceAddress ? ensembleIdent : null),
            },
        });

        const promise = fetchQuery(surfaceDataOptions).then((data) => ({
            format: this._dataFormat,
            surfaceData: transformSurfaceData(data),
        }));

        return promise as Promise<SurfaceData>;
    }
}

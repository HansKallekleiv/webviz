import { PolygonsMeta_api, SurfaceDataPng_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ItemDelegate } from "@modules/LayerSpike/layers/delegates/ItemDelegate";
import { LayerDelegate } from "@modules/LayerSpike/layers/delegates/LayerDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/LayerSpike/layers/queryConstants";
import { SettingType } from "@modules/LayerSpike/layers/settingsTypes";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";
import { StratigraphicUnit } from "src/api/models/StratigraphicUnit";

import { RealizationSurfaceContext } from "./RealizationSurfaceContext";
import { RealizationSurfaceSettings } from "./types";

import { Layer } from "../../../interfaces";

export class RealizationSurfaceLayer
    implements Layer<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>
{
    private _layerDelegate: LayerDelegate<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>;
    private _itemDelegate: ItemDelegate;

    constructor() {
        this._itemDelegate = new ItemDelegate("Realization Surface");
        this._layerDelegate = new LayerDelegate(this, new RealizationSurfaceContext());
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationSurfaceSettings,
        newSettings: RealizationSurfaceSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fechData(queryClient: QueryClient): Promise<SurfaceDataFloat_trans | SurfaceDataPng_api> {
        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();

        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const surfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();
        const timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();

        if (ensembleIdent && surfaceName && attribute && realizationNum !== null) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);
            addrBuilder.withRealization(realizationNum);

            if (timeOrInterval !== SurfaceTimeType_api.NO_TIME) {
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }

            surfaceAddress = addrBuilder.buildRealizationAddress();
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const queryKey = ["getSurfaceData", surfAddrStr, null, "png"];

        this._layerDelegate.registerQueryKey(queryKey);

        //tthis doesnt work
        return findFaultPolygonsBySurfaceName(queryClient, ensembleIdent, realizationNum, surfaceName).then(
            (polygonsMeta) => {
                const promise = queryClient
                    .fetchQuery({
                        queryKey,
                        queryFn: () => apiService.surface.getSurfaceData(surfAddrStr ?? "", "png", null),
                        staleTime: STALE_TIME,
                        gcTime: CACHE_TIME,
                    })
                    .then((data) => transformSurfaceData(data));

                return promise;
            }
        );
    }
}

async function findFaultPolygonsBySurfaceName(
    queryClient: QueryClient,
    ensembleIdent: EnsembleIdent | null,
    realizationNum: number | null,
    surfaceName: string | null
): Promise<PolygonsMeta_api | null> {
    const [polygonsInfo, stratigraphicUnits] = await Promise.all([
        queryClient.fetchQuery({
            queryKey: ["getRealizationPolysMetadata", ensembleIdent, realizationNum],
            queryFn: () =>
                apiService.polygons.getPolygonsDirectory(
                    ensembleIdent?.getCaseUuid() ?? "",
                    ensembleIdent?.getEnsembleName() ?? ""
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        }),
        queryClient.fetchQuery({
            queryKey: ["getStratigraphicUnits", ensembleIdent?.getCaseUuid()],
            queryFn: () => apiService.stratigraphy.getStratigraphicUnits(ensembleIdent?.getCaseUuid() ?? ""),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        }),
    ]);

    // First try to match surfaceName on polygonsInfo array
    let found = polygonsInfo.find((poly) => poly.name === surfaceName);
    if (found) {
        return found;
    }

    // Then try to lookup surface name from stratigraphicUnit
    let stratigraphicUnit = stratigraphicUnits.find((unit) => unit.identifier === surfaceName);
    if (stratigraphicUnit) {
        found = polygonsInfo.find((poly) => poly.name === stratigraphicUnit.top);
        if (found) {
            return found;
        }
        found = polygonsInfo.find((poly) => poly.name === stratigraphicUnit.base);
        if (found) {
            return found;
        }
    }

    return null;
}

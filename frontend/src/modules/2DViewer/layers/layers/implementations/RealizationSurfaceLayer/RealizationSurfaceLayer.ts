import { SurfaceDataPng_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { ItemDelegate } from "@modules/2DViewer/layers/delegates/ItemDelegate";
import { LayerColoringType, LayerDelegate } from "@modules/2DViewer/layers/delegates/LayerDelegate";
import { LayerManager } from "@modules/2DViewer/layers/framework/LayerManager/LayerManager";
import { LayerRegistry } from "@modules/2DViewer/layers/layers/LayerRegistry";
import { CACHE_TIME, STALE_TIME } from "@modules/2DViewer/layers/layers/_utils/queryConstants";
import { SettingType } from "@modules/2DViewer/layers/settings/settingsTypes";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationSurfaceSettingsContext } from "./RealizationSurfaceSettingsContext";
import { RealizationSurfaceSettings } from "./types";

import { BoundingBox, Layer, SerializedLayer } from "../../../interfaces";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { add } from "@equinor/eds-core-react/dist/types/components/Icon/library";

export class RealizationSurfaceLayer
    implements Layer<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>
{
    private _layerDelegate: LayerDelegate<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>;
    private _itemDelegate: ItemDelegate;

    constructor(layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate("Realization Surface", layerManager);
        this._layerDelegate = new LayerDelegate(
            this,
            layerManager,
            new RealizationSurfaceSettingsContext(layerManager),
            LayerColoringType.COLORSCALE
        );
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

    makeBoundingBox(): BoundingBox | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return {
            x: [data.transformed_bbox_utm.min_x, data.transformed_bbox_utm.max_x],
            y: [data.transformed_bbox_utm.min_y, data.transformed_bbox_utm.max_y],
            z: [0, 0],
        };
    }

    makeValueRange(): [number, number] | null {
        const data = this._layerDelegate.getData();
        if (!data) {
            return null;
        }

        return [data.value_min, data.value_max];
    }

    fetchData(queryClient: QueryClient): Promise<SurfaceDataFloat_trans | SurfaceDataPng_api> {
        

        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const surfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();
        const timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        
        if (ensembleIdent && surfaceName && attribute && realizationNum !== null) {
            const addrBuilder = new SurfaceAddressBuilder();

            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);
            addrBuilder.withRealization(realizationNum);
            if (timeOrInterval !== SurfaceTimeType_api.NO_TIME) {
                addrBuilder.withTimeOrInterval(timeOrInterval);
            }

            if (isEnsembleIdentOfType(ensembleIdent, RegularEnsembleIdent)) {
                addrBuilder.withEnsembleIdent(ensembleIdent);
                let surfaceAddress: FullSurfaceAddress | null = null;
                surfaceAddress = addrBuilder.buildRealizationAddress();
                const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

                const queryKey = ["getSurfaceData", surfAddrStr, null, "png"];
                this._layerDelegate.registerQueryKey(queryKey);

                return queryClient
                    .fetchQuery({
                        queryKey,
                        queryFn: () => apiService.surface.getSurfaceData(surfAddrStr ?? "", "png", null),
                        staleTime: STALE_TIME,
                        gcTime: CACHE_TIME,
                    })
                    .then((data) => transformSurfaceData(data));

                
            }
            if (isEnsembleIdentOfType(ensembleIdent,DeltaEnsembleIdent)) {
                
                let surfaceAddressA: FullSurfaceAddress | null = null;
                let surfaceAddressB: FullSurfaceAddress | null = null;

                addrBuilder.withEnsembleIdent(ensembleIdent.getReferenceEnsembleIdent());
                surfaceAddressA = addrBuilder.buildRealizationAddress();
                const surfAddrStrA = surfaceAddressA ? encodeSurfAddrStr(surfaceAddressA) : null;
                
                addrBuilder.withEnsembleIdent(ensembleIdent.getComparisonEnsembleIdent());
                surfaceAddressB = addrBuilder.buildRealizationAddress();
                const surfAddrStrB = surfaceAddressB ? encodeSurfAddrStr(surfaceAddressB) : null;

                const queryKey = ["getDeltaSurfaceData", surfAddrStrA, surfAddrStrB, null, "png"];
                this._layerDelegate.registerQueryKey(queryKey);
                return queryClient
                    .fetchQuery({
                    queryKey: ["getDeltaSurfaceData", surfAddrStrA, surfAddrStrB, null, "png"],
                    queryFn: () => apiService.surface.getDeltaSurfaceData(surfAddrStrA ?? "", surfAddrStrB ?? "", "png", null),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                }).then((data) => transformSurfaceData(data));;
                

              
            }
        }
        return new Promise((resolve) => resolve(null as unknown as SurfaceDataFloat_trans));
    }

    serializeState(): SerializedLayer<RealizationSurfaceSettings> {
        return this._layerDelegate.serializeState();
    }

    deserializeState(serializedState: SerializedLayer<RealizationSurfaceSettings>): void {
        this._layerDelegate.deserializeState(serializedState);
    }
}

LayerRegistry.registerLayer(RealizationSurfaceLayer);

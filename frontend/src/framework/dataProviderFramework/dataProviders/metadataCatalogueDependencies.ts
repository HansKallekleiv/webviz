import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import {
    fetchInplaceVolumesTableDefinitionsCatalogue,
    fetchVectorListCatalogue,
} from "@framework/domain/metadataCatalogues";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { Accessors, Read } from "../delegates/_utils/Dependency";
import type { SetupBasicBindingsContext } from "../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap, SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { Settings } from "../settings/settingsDefinitions";

export function makeVectorListSharedResult<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
>(
    context: SetupBasicBindingsContext<TSettings, TSettingTypes, TKey>,
    readEnsemble: (
        read: Accessors<TSettings, TSettingTypes, TKey>,
    ) => Read<RegularEnsembleIdent | DeltaEnsembleIdent | null>,
) {
    return context.makeSharedResult({
        debugName: "VectorListCatalogue",
        read(read) {
            return { ensemble: readEnsemble(read) };
        },
        async resolve({ ensemble }, { abortSignal }) {
            if (!ensemble) {
                return null;
            }
            return fetchVectorListCatalogue(context.queryClient, ensemble, abortSignal);
        },
    });
}

export function makeInplaceVolumesTableDefinitionsSharedResult<
    TSettings extends Settings,
    TSettingTypes extends MakeSettingTypesMap<TSettings>,
    TKey extends SettingsKeysFromTuple<TSettings>,
>(
    context: SetupBasicBindingsContext<TSettings, TSettingTypes, TKey>,
    readEnsemble: (read: Accessors<TSettings, TSettingTypes, TKey>) => Read<RegularEnsembleIdent | null>,
) {
    return context.makeSharedResult({
        debugName: "InplaceVolumesTableDefinitionsCatalogue",
        read(read) {
            return { ensemble: readEnsemble(read) };
        },
        async resolve({ ensemble }, { abortSignal }) {
            if (!ensemble) {
                return null;
            }
            return fetchInplaceVolumesTableDefinitionsCatalogue(context.queryClient, ensemble, abortSignal);
        },
    });
}
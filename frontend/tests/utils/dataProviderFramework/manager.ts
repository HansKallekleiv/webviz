import { QueryClient } from "@tanstack/react-query";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
import {
    DataProviderManager,
    type DataProviderManagerOptions,
    type GlobalSettings,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

export const GROUP_COLORS = ["#group-color-1", "#group-color-2", "#group-color-3"];

// Just enough of a WorkbenchSession for constructing a DataProviderManager.
function makeFakeWorkbenchSession(ensembleSet?: EnsembleSet): WorkbenchSession {
    return {
        getPublishSubscribeDelegate: () => new PublishSubscribeDelegate(),
        getEnsembleSet: () => ensembleSet ?? { getRegularEnsembleArray: () => [], getDeltaEnsembleArray: () => [] },
        getUserCreatedItems: () => ({
            getIntersectionPolylines: () => ({ subscribe: () => () => {}, getPolylines: () => [] }),
        }),
    } as unknown as WorkbenchSession;
}

// Just enough of a WorkbenchSettings for groups, which take their color from the categorical palette.
function makeFakeWorkbenchSettings(): WorkbenchSettings {
    return {
        getSelectedColorPalette: () => ({ getColors: () => GROUP_COLORS }),
    } as unknown as WorkbenchSettings;
}

export type MakeDataProviderManagerOptions = {
    /** Served by the fake workbench session, so the manager derives `ensembles`/`deltaEnsembles` itself. */
    ensembleSet?: EnsembleSet;
    managerOptions?: DataProviderManagerOptions;
};

export function makeDataProviderManager(
    globalSettings: Partial<GlobalSettings> = {},
    { ensembleSet, managerOptions }: MakeDataProviderManagerOptions = {},
): DataProviderManager {
    // Without retries, a failing request fails right away instead of after TanStack's retry delays
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const manager = new DataProviderManager(
        makeFakeWorkbenchSession(ensembleSet),
        makeFakeWorkbenchSettings(),
        queryClient,
        managerOptions,
    );
    for (const [key, value] of Object.entries(globalSettings)) {
        manager.updateGlobalSetting(key as keyof GlobalSettings, value);
    }
    return manager;
}

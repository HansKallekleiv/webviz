import type { QueryClient } from "@tanstack/react-query";

import { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

/** A minimal session without ensembles: enough to build trees and settings, never fetches. */
export function makeStubWorkbenchSession(): WorkbenchSession {
    const sessionDelegate = new PublishSubscribeDelegate();
    return {
        getEnsembleSet: () => ({ getRegularEnsembleArray: () => [] as RegularEnsemble[], getEnsembleArray: () => [] }),
        getRealizationFilterSet: () => ({
            getRealizationFilterForEnsembleIdent: () => ({ getFilteredRealizations: () => [] }),
        }),
        getUserCreatedItems: () => ({
            getIntersectionPolylines: () => ({
                getPolylines: () => [],
                subscribe: () => () => undefined,
            }),
        }),
        getPublishSubscribeDelegate: () => sessionDelegate,
    } as unknown as WorkbenchSession;
}

export function makeStubDataProviderManager(
    queryClient: QueryClient = {} as QueryClient,
    workbenchSettings: WorkbenchSettings = {
        getSelectedColorPalette: () => ({ getColors: () => ["#123456"] }),
    } as unknown as WorkbenchSettings,
): DataProviderManager {
    return new DataProviderManager(makeStubWorkbenchSession(), workbenchSettings, queryClient);
}

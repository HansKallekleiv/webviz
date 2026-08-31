import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import type { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { IntersectionPolylinesEvent } from "@framework/userCreatedItems/IntersectionPolylines";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

describe("DataProviderManager", () => {
    test("sources session-owned global settings and keeps module-owned settings unset", () => {
        const sessionDelegate = new PublishSubscribeDelegate();
        const firstEnsemble = { name: "first" } as unknown as RegularEnsemble;
        const secondEnsemble = { name: "second" } as unknown as RegularEnsemble;
        let ensembles: readonly RegularEnsemble[] = [firstEnsemble];
        let polylines: readonly IntersectionPolyline[] = [];
        let notifyPolylineChange: () => void = () => undefined;

        const workbenchSession = {
            getEnsembleSet: () => ({ getRegularEnsembleArray: () => ensembles }),
            getRealizationFilterSet: () => ({
                getRealizationFilterForEnsembleIdent: () => ({ getFilteredRealizations: () => [] }),
            }),
            getUserCreatedItems: () => ({
                getIntersectionPolylines: () => ({
                    getPolylines: () => polylines,
                    subscribe: (event: IntersectionPolylinesEvent, callback: () => void) => {
                        expect(event).toBe(IntersectionPolylinesEvent.CHANGE);
                        notifyPolylineChange = callback;
                        return () => undefined;
                    },
                }),
            }),
            getPublishSubscribeDelegate: () => sessionDelegate,
        } as unknown as WorkbenchSession;
        const workbenchSettings = {
            getSelectedColorPalette: () => ({ getColors: () => ["#000000"] }),
        } as unknown as WorkbenchSettings;
        const manager = new DataProviderManager(workbenchSession, workbenchSettings, {} as QueryClient);

        expect(manager.getGlobalSetting("ensembles")).toEqual([firstEnsemble]);
        expect(manager.getGlobalSetting("intersectionPolylines")).toEqual([]);
        expect(manager.getGlobalSetting("fieldId")).toBeNull();
        expect(manager.getGlobalSetting("wellboreUuid")).toBeNull();

        ensembles = [secondEnsemble];
        sessionDelegate.notifySubscribers(WorkbenchSessionTopic.ENSEMBLE_SET);
        expect(manager.getGlobalSetting("ensembles")).toEqual([secondEnsemble]);

        const initialFilterFunction = manager.getGlobalSetting("realizationFilterFunction");
        sessionDelegate.notifySubscribers(WorkbenchSessionTopic.REALIZATION_FILTER_SET);
        expect(manager.getGlobalSetting("realizationFilterFunction")).not.toBe(initialFilterFunction);

        polylines = [{ id: "polyline", name: "Polyline", color: "#000000", path: [], fieldId: "field" }];
        notifyPolylineChange();
        expect(manager.getGlobalSetting("intersectionPolylines")).toEqual(polylines);

        manager.beforeDestroy();
    });
});
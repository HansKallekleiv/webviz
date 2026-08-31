import { describe, expect, test, vi } from "vitest";

import { Frequency_api } from "@api";
import { filterEnsembleIdentsBySupportedKinds } from "@framework/dataProviderFramework/dataProviders/ensembleKinds";
import { DataProvider } from "@framework/dataProviderFramework/framework/DataProvider/DataProvider";
import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { CustomDataProviderImplementation } from "@framework/dataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import { SettingRegistry } from "@framework/dataProviderFramework/settings/SettingRegistry";
import "@framework/dataProviderFramework/settings/SettingRegistry/_registerAllSettings";
import { Setting } from "@framework/dataProviderFramework/settings/settingsDefinitions";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

const FIRST_UUID = "00000000-0000-4000-8000-000000000001";
const SECOND_UUID = "00000000-0000-4000-8000-000000000002";

describe("Step 3 settings", () => {
    test.each([
        [Setting.VECTOR_NAME, "Vector"],
        [Setting.VECTOR_RESAMPLING_FREQUENCY, "Resampling Frequency"],
        [Setting.INPLACE_RESULT, "Result"],
        [Setting.ZONE, "Zone"],
        [Setting.REGION, "Region"],
        [Setting.FACIES, "Facies"],
        [Setting.LICENSE, "License"],
    ])("registers %s", (settingType, label) => {
        const setting = SettingRegistry.makeSetting(settingType);
        expect(setting.getLabel()).toBe(label);
        setting.beforeDestroy();
    });

    test("selects all available values by default for index filters", () => {
        const setting = SettingRegistry.makeSetting(Setting.ZONE);
        setting.setValueConstraints(["A", "B"]);
        expect(setting.getValue()).toEqual(["A", "B"]);
        setting.beforeDestroy();
    });

    test("supports raw and generated vector frequencies", () => {
        const setting = SettingRegistry.makeSetting(Setting.VECTOR_RESAMPLING_FREQUENCY);
        setting.setValueConstraints([null, Frequency_api.MONTHLY]);
        expect(setting.getValue()).toBeNull();
        setting.beforeDestroy();
    });

    test("filters ensemble constraints by provider capability", () => {
        const first = new RegularEnsembleIdent(FIRST_UUID, "first");
        const second = new RegularEnsembleIdent(SECOND_UUID, "second");
        const delta = new DeltaEnsembleIdent(first, second);

        expect(filterEnsembleIdentsBySupportedKinds([first, delta], ["regular"])).toEqual([first]);
        expect(filterEnsembleIdentsBySupportedKinds([first, delta], ["delta"])).toEqual([delta]);
        expect(filterEnsembleIdentsBySupportedKinds([first, delta], ["regular", "delta"])).toEqual([first, delta]);
    });

    test("applies provider ensemble capability to bound constraints", async () => {
        const first = new RegularEnsembleIdent(FIRST_UUID, "first");
        const second = new RegularEnsembleIdent(SECOND_UUID, "second");
        const delta = new DeltaEnsembleIdent(first, second);
        const settings = [Setting.ENSEMBLE] as const;
        const implementation: CustomDataProviderImplementation<typeof settings, null> = {
            settings,
            supportsEnsembleKinds: ["delta"],
            getDefaultName: () => "Delta provider",
            setupBindings({ setting }) {
                setting(Setting.ENSEMBLE).bindValueConstraints({
                    resolve: () => [first, delta] as unknown as RegularEnsembleIdent[],
                });
            },
            async fetchData() {
                return null;
            },
        };
        const managerDelegate = new PublishSubscribeDelegate();
        const manager = {
            getPublishSubscribeDelegate: () => managerDelegate,
            getGlobalSetting: () => null,
            getWorkbenchSession: () => ({}),
            getWorkbenchSettings: () => ({}),
            getQueryClient: () => ({}),
            getGroupDelegate: () => null,
            publishTopic: () => undefined,
        } as unknown as DataProviderManager;
        const provider = new DataProvider({
            type: "delta-provider",
            dataProviderManager: manager,
            customDataProviderImplementation: implementation,
        });

        await vi.waitFor(() => {
            expect(
                provider.getSettingsContextDelegate().getSettings()[Setting.ENSEMBLE].getValueConstraints(),
            ).toEqual([delta]);
        });
        provider.beforeDestroy();
    });
});
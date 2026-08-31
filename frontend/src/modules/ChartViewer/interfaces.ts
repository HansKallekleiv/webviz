import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { dataProviderManagerAtom } from "./settings/atoms";

export type SettingsToViewInterface = {
    dataProviderManager: DataProviderManager | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    dataProviderManager: (get) => get(dataProviderManagerAtom),
};

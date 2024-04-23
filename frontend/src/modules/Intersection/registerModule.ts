import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { SettingsToViewInterface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "Intersection";

ModuleRegistry.registerModule<State, SettingsToViewInterface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Intersection",
    description: "Intersection",
    preview,
    syncableSettingKeys: [
        SyncSettingKey.ENSEMBLE,
        SyncSettingKey.INTERSECTION,
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
    ],
});

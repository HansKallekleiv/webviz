import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "WellStratigraphy",
    defaultTitle: "Well depth reference",
    description: "Official well stratigraphy",
    syncableSettingKeys: [SyncSettingKey.WELLBORE],
});

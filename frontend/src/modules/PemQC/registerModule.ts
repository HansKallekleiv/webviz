import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "PemQC",
    defaultTitle: "Pem QC",
    description: "QC of PEM results",
});

ModuleRegistry.registerModule<State>({
    moduleName: "PemQC",
    defaultTitle: "Pem QC",
    syncableSettingKeys: [SyncSettingKey.WELLBORE],
});

import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "InplaceVolumetricsTable";
const description = "Inplace Volumetrics Table";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumetrics Table",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description,
    syncableSettingKeys: [SyncSettingKey.INPLACE_VOLUMETRICS_FILTER],
    preview,
});

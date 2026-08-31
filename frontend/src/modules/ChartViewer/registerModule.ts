import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";

export const MODULE_NAME = "ChartViewer";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Chart Viewer",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "Generic charts for summary vectors and in-place volumes.",
    dataTagIds: [ModuleDataTagId.SUMMARY, ModuleDataTagId.INPLACE_VOLUMES, ModuleDataTagId.OBSERVATIONS],
    channelDefinitions: channelDefs,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});

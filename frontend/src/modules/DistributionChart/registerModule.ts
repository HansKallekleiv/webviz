import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { channelDefs } from "@modules/_shared/ChartViewer/channelDefs";
import type { Interfaces } from "@modules/_shared/ChartViewer/interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "@modules/_shared/ChartViewer/persistence";

export const MODULE_NAME = "DistributionChart";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Distribution Chart",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "Distribution charts and statistics tables for in-place volumes.",
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMES],
    channelDefinitions: channelDefs,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});

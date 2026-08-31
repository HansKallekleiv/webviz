import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { channelDefs } from "@modules/_shared/ChartViewer/channelDefs";
import type { Interfaces } from "@modules/_shared/ChartViewer/interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "@modules/_shared/ChartViewer/persistence";

export const MODULE_NAME = "TimeSeriesChart";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Time Series Chart",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "Time-series charts for simulation summary vectors and observations.",
    dataTagIds: [ModuleDataTagId.SUMMARY, ModuleDataTagId.OBSERVATIONS],
    channelDefinitions: channelDefs,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});

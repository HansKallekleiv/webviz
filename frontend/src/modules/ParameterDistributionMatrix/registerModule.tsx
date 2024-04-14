import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interface } from "./settingstoViewInterface";
import { State } from "./state";

export const MODULE_NAME = "ParameterDistributionMatrix";
ModuleRegistry.registerModule<State, Interface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Parameter Distribution Matrix",
});

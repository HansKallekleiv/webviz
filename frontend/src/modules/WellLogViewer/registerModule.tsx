import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SettingsToViewInterface } from "./settingsToViewInterface";
// import { preview } from "./preview";
import { State } from "./state";

export const MODULE_NAME = "WellLogViewer";

ModuleRegistry.registerModule<State, SettingsToViewInterface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Well Log Viewer",
    description: "View well logs from official sources.",
    // preview,
});

import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { s } from "vitest/dist/reporters-qc5Smpt5";

import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "SeismicIntersection",
    defaultTitle: "Seismic Intersection",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.WELLBORE],
    description: "Visualization of intersection data with a wellbore and seismic fence",
});

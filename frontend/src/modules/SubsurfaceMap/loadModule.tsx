import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ColorScale } from "@lib/utils/ColorScale";

import { Settings } from "./settings";
import { state } from "./state";
import { View } from "./view";

const defaultState: state = {
    surfaceAddresses: null,
    surfaceColorScale: null,
    polygonsAddress: null,
    selectedWellUuids: [],
    surfaceSettings: null,
    viewSettings: null,
};

const module = ModuleRegistry.initModule<state>("SubsurfaceMap", defaultState, {
    surfaceAddresses: { deepCompare: true },
    polygonsAddress: { deepCompare: true },
    surfaceSettings: { deepCompare: true },
});

module.viewFC = View;
module.settingsFC = Settings;

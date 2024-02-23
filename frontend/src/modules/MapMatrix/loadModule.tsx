import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings/settings";
import { MapMatrixDefaultState, State } from "./state";
import { view } from "./view/view";

const module = ModuleRegistry.initModule<State>("MapMatrix", MapMatrixDefaultState);

module.viewFC = view;
module.settingsFC = settings;

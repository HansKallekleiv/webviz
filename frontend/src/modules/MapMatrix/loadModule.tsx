import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    surfaceSpecifications: [],
};

const module = ModuleRegistry.initModule<State>("MapMatrix", defaultState);

module.viewFC = view;
module.settingsFC = settings;

import { Frequency_api } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {

};

const module = ModuleRegistry.initModule<State>("StructuralUncertainty", defaultState);

module.viewFC = view;
module.settingsFC = settings;

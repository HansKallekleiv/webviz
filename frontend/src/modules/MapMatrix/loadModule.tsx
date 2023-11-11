import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    surfaceSpecifications: [],
    colorScaleGradientType: ColorScaleGradientType.Sequential,
};

const module = ModuleRegistry.initModule<State>("MapMatrix", defaultState);

module.viewFC = view;
module.settingsFC = settings;

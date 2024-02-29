import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = { ensembleIdent: null, wellboreAddress: null };

const module = ModuleRegistry.initModule<State>("WellStratigraphy", defaultState);

module.viewFC = View;
module.settingsFC = settings;

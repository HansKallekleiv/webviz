import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { wellboreLogCurvesDataQueryAtom } from "./settings/atoms/queryAtoms";
import { CombinedLogCurvesResult, LogCurveResult } from "./typesAndEnums";

export type SettingsToViewInterface = {
    baseStates: {};
    derivedStates: { logCurvesDataQueries: CombinedLogCurvesResult };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {},
    derivedStates: {
        logCurvesDataQueries: (get) => {
            return get(wellboreLogCurvesDataQueryAtom);
        },
    },
};

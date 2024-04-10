import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { selectedDrilledWellboreAtom } from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    baseStates: {};
    derivedStates: { wellboreUuid: string | null };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {},
    derivedStates: {
        wellboreUuid: (get) => {
            return get(selectedDrilledWellboreAtom);
        },
    },
};

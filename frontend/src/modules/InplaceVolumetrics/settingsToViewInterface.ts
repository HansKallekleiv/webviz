import { InplaceVolumetricsIndex_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { colorByAtom, groupByAtom } from "./settings/atoms/baseAtoms";
import {
    availableInplaceResponsesAtom,
    selectedEnsembleIdentsAtom,
    selectedInplaceCategoriesAtom,
    selectedInplaceResponseAtom,
    selectedInplaceTableNameAtom,
} from "./settings/atoms/derivedAtoms";
import { PlotGroupingEnum } from "./typesAndEnums";

export type Interface = {
    baseStates: {};
    derivedStates: {
        colorBy: PlotGroupingEnum;
        groupBy: PlotGroupingEnum;
        selectedEnsembleIdents: EnsembleIdent[];
        selectedInplaceTableName: string | null;
        selectedInplaceResponseName: string | null;
        availableInplaceResponseNames: string[];
        selectedInplaceCategories: InplaceVolumetricsIndex_api[];
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    baseStates: {},
    derivedStates: {
        colorBy: (get) => {
            return get(colorByAtom);
        },
        groupBy: (get) => {
            return get(groupByAtom);
        },
        selectedEnsembleIdents: (get) => {
            return get(selectedEnsembleIdentsAtom);
        },
        selectedInplaceTableName: (get) => {
            return get(selectedInplaceTableNameAtom);
        },
        selectedInplaceResponseName: (get) => {
            return get(selectedInplaceResponseAtom);
        },
        availableInplaceResponseNames: (get) => {
            return get(availableInplaceResponsesAtom);
        },
        selectedInplaceCategories: (get) => {
            return get(selectedInplaceCategoriesAtom);
        },
    },
};

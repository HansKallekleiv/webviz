import { EnsembleSet } from "@framework/EnsembleSet";

import { atom } from "jotai";
import { isEqual } from "lodash";

import { EnsembleIdent } from "./EnsembleIdent";
import { RealizationFilterSet } from "./RealizationFilterSet";
import { EnsembleRealizationFilterFunction } from "./WorkbenchSession";
import { atomWithCompare } from "./utils/atomUtils";

export const EnsembleSetAtom = atomWithCompare<EnsembleSet>(new EnsembleSet([]), isEqual);

export const EnsembleRealizationFilterFunctionAtom = atom<EnsembleRealizationFilterFunction | null>((get) => {
    const realizationFilterSet = get(RealizationFilterSetAtom);

    if (!realizationFilterSet) {
        return null;
    }

    return (ensembleIdent: EnsembleIdent) =>
        realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent).getFilteredRealizations();
});

export const RealizationFilterSetAtom = atomWithCompare<RealizationFilterSet | null>(null, isEqual);

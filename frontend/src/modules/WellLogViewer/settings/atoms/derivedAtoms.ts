import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import {
    userSelectedDrilledWellboreUuidAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedLogrunAtom,
} from "./baseAtoms";
import { drilledWellboreHeadersQueryAtom, wellboreLogCurveHeadersQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    if (userSelectedEnsembleIdent === null || !ensembleSet.hasEnsemble(userSelectedEnsembleIdent)) {
        return ensembleSet.getEnsembleArr()[0].getIdent() || null;
    }
    return userSelectedEnsembleIdent;
});

export const selectedDrilledWellboreAtom = atom((get) => {
    const userSelectedDrilledWellboreUuid = get(userSelectedDrilledWellboreUuidAtom);
    const drilledWellboreHeaders = get(drilledWellboreHeadersQueryAtom);
    if (!drilledWellboreHeaders.data) {
        return null;
    }
    if (
        !userSelectedDrilledWellboreUuid ||
        !drilledWellboreHeaders.data.some((header) => header.wellbore_uuid === userSelectedDrilledWellboreUuid)
    ) {
        return drilledWellboreHeaders.data[0].wellbore_uuid ?? null;
    }
    return userSelectedDrilledWellboreUuid;
});

export const selectedLogRunAtom = atom<string | null>((get) => {
    const userSelectedLogrun = get(userSelectedLogrunAtom);
    const wellboreLogCurveHeaders = get(wellboreLogCurveHeadersQueryAtom);
    if (!wellboreLogCurveHeaders.data || wellboreLogCurveHeaders.data.length === 0) {
        return null;
    }
    if (
        userSelectedLogrun === null ||
        !wellboreLogCurveHeaders.data.map((header) => header.log_name === userSelectedLogrun)
    ) {
        return wellboreLogCurveHeaders.data[0].log_name ?? null;
    }
    return userSelectedLogrun;
});

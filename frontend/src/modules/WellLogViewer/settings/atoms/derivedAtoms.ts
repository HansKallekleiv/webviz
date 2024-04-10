import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import {
    userSelectedDrilledWellboreUuidAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedLogCurveNamesAtom,
    userSelectedLogRunNameAtom,
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

export const selectedLogRunNameAtom = atom<string | null>((get) => {
    const userSelectedLogRunName = get(userSelectedLogRunNameAtom);
    const wellboreLogCurveHeaders = get(wellboreLogCurveHeadersQueryAtom);
    if (!wellboreLogCurveHeaders.data || wellboreLogCurveHeaders.data.length === 0) {
        return null;
    }
    if (
        userSelectedLogRunName === null ||
        !wellboreLogCurveHeaders.data.map((header) => header.log_name === userSelectedLogRunName)
    ) {
        return wellboreLogCurveHeaders.data[0].log_name ?? null;
    }
    return userSelectedLogRunName;
});

export const selectedLogCurveNamesAtom = atom<string[]>((get) => {
    const userSelectedLogCurveNames = get(userSelectedLogCurveNamesAtom);
    const wellboreLogCurveHeaders = get(wellboreLogCurveHeadersQueryAtom);
    const wellboreLogRunName = get(selectedLogRunNameAtom);
    if (!wellboreLogCurveHeaders.data) {
        return [];
    }
    // Find curve headers that has the given logrun name
    const curveHeaders = wellboreLogCurveHeaders.data.filter((header) => header.log_name === wellboreLogRunName);
    if (curveHeaders.length === 0) {
        return [];
    }
    if (userSelectedLogCurveNames.length === 0) {
        return curveHeaders.map((header) => header.curve_name);
    }
    // Check that all user selected curve names are in the curve headers
    const selectedCurveNames = userSelectedLogCurveNames.filter((curveName) =>
        curveHeaders.some((header) => header.curve_name === curveName)
    );
    if (selectedCurveNames.length === 0) {
        return curveHeaders.map((header) => header.curve_name);
    }
    return selectedCurveNames;
});

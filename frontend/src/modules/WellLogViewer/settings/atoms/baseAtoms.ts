import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedDrilledWellboreUuidAtom = atom<string | null>(null);
export const userSelectedLogRunNameAtom = atom<string | null>(null);
export const userSelectedLogCurveNamesAtom = atom<string[]>([]);

import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedDrilledWellboreUuidAtom = atom<string | null>(null);
export const userSelectedLogrunAtom = atom<string | null>(null);

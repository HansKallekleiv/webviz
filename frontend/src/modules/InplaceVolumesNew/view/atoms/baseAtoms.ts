import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesNew/typesAndEnums";
import type { InplaceVolumesFilterSelections } from "@modules/InplaceVolumesNew/typesAndEnums";
import { atom } from "jotai";

export const filterAtom = atom<InplaceVolumesFilterSelections>({
    ensembleIdents: [],
    tableNames: [],
    indicesWithValues: [],
    areSelectedTablesComparable: false,
});
export const firstResultNameAtom = atom<string | null>(null);
export const selectorColumnAtom = atom<string | null>(null);
export const subplotByAtom = atom<string>(TableOriginKey.ENSEMBLE);
export const plotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);
export const colorByAtom = atom<string>(TableOriginKey.TABLE_NAME);
export const areTableDefinitionSelectionsValidAtom = atom(false);

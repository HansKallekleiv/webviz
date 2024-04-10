import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedDrilledWellboreAtom, selectedEnsembleIdentAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;
export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);

    const caseUuid = ensembleIdent?.getCaseUuid() ?? "";

    return {
        queryKey: ["getDrilledWellboreHeaders", caseUuid],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(caseUuid),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(caseUuid),
    };
});

export const wellboreLogCurveHeadersQueryAtom = atomWithQuery((get) => {
    const drilledWellboreUuid = get(selectedDrilledWellboreAtom);

    return {
        queryKey: ["wellboreLogCurveHeaders", drilledWellboreUuid],
        queryFn: () => apiService.well.getWellboreLogCurveHeaders(drilledWellboreUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(drilledWellboreUuid),
    };
});

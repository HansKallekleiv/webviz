import { WellboreLogCurveData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { CombinedLogCurvesResult } from "@modules/WellLogViewer/typesAndEnums";
import { UseQueryResult } from "@tanstack/react-query";

import { atomWithQuery } from "jotai-tanstack-query";
import { get } from "lodash";

import { userSelectedLogCurveNamesAtom } from "./baseAtoms";
import { selectedDrilledWellboreAtom, selectedEnsembleIdentAtom, selectedLogRunNameAtom } from "./derivedAtoms";

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

export const wellboreLogCurvesDataQueryAtom = atomWithQueries((get) => {
    const drilledWellboreUuid = get(selectedDrilledWellboreAtom);
    //What about log run name / "log name"?? Expecting unique curve name across logs?
    const logCurveNames = get(userSelectedLogCurveNamesAtom);

    const queries = logCurveNames.map((logCurveName) => {
        return () => ({
            queryKey: ["wellboreLogCurveData", drilledWellboreUuid, logCurveName],
            queryFn: () => apiService.well.getLogCurveData(drilledWellboreUuid ?? "", logCurveName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: Boolean(drilledWellboreUuid),
        });
    });
    const combine = (results: UseQueryResult<WellboreLogCurveData_api, Error>[]): CombinedLogCurvesResult => {
        return {
            curvesData: logCurveNames.map((logCurveName, idx) => {
                return {
                    logCurveName: logCurveName,
                    data: results[idx]?.data ?? null,
                };
            }),
            isFetching: results.some((result) => result.isFetching),
            someQueriesFailed: results.some((result) => result.isError),
            allQueriesFailed: results.every((result) => result.isError),
        };
    };
    return {
        queries,
        combine,
    };
});

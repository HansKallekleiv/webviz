import { BlockedWellLog_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

export function useBlockedWellNames(caseUuid: string | null, ensembleName: string | null): UseQueryResult<string[]> {
    return useQuery({
        queryKey: ["getBlockedWellNames", caseUuid, ensembleName],
        queryFn: () => apiService.well.getBlockedWellLogNames(caseUuid ?? "", ensembleName ?? ""),
        staleTime: 100,
        gcTime: 100,
        enabled: caseUuid && ensembleName ? true : false,
    });
}
export function useBlockedWellLogs(
    caseUuid: string | null,
    ensembleName: string | null,
    wellName: string | null
): UseQueryResult<BlockedWellLog_api[]> {
    return useQuery({
        queryKey: ["getBlockedWellLogs", caseUuid, ensembleName, wellName],
        queryFn: () => apiService.well.getBlockedWellLogs(caseUuid ?? "", ensembleName ?? "", wellName ?? ""),
        staleTime: 100,
        gcTime: 100,
        enabled: caseUuid && ensembleName && wellName ? true : false,
    });
}

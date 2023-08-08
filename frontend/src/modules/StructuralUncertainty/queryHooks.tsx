import { SumoContent_api, StaticSurfaceDirectory_api, SurfaceData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";


const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useStaticSurfaceDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined,
    contentFilter: SumoContent_api[] | undefined,
    allowEnable: boolean
): UseQueryResult<StaticSurfaceDirectory_api> {
    return useQuery({
        queryKey: ["getStaticSurfaceDirectory", caseUuid, ensembleName, contentFilter],
        queryFn: () => apiService.surface.getStaticSurfaceDirectory(caseUuid ?? "", ensembleName ?? "",contentFilter),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: allowEnable && caseUuid && ensembleName ? true : false,
    });
}
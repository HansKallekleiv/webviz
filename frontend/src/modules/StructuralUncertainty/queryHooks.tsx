import {
    IntersectionPolyLine_api,
    StaticSurfaceDirectory_api,
    StaticSurfaceRealizationsIntersectionRequest_api,
    SumoContent_api,
    WellBoreHeader_api,
} from "@api";
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
        queryFn: () => apiService.surface.getStaticSurfaceDirectory(caseUuid ?? "", ensembleName ?? "", contentFilter),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: allowEnable && caseUuid && ensembleName ? true : false,
    });
}

export function useWellBoreHeadersQuery(caseUuid: string | undefined): UseQueryResult<WellBoreHeader_api[]> {
    return useQuery({
        queryKey: ["getWellHeaders", caseUuid],
        queryFn: () => apiService.well.getWellHeaders(caseUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: caseUuid ? true : false,
    });
}

export function useStaticSurfaceRealizations(
    data: StaticSurfaceRealizationsIntersectionRequest_api
): UseQueryResult<IntersectionPolyLine_api[]> {
    console.log(data);
    return useQuery({
        queryKey: ["getStaticSurfaceRealizations", data],
        queryFn: () => apiService.intersection.staticSurfaceRealizations(data ?? {}),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: true,
    });
}

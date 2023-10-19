import {
    Body_get_surface_intersections_api,
    SurfaceIntersectionData_api,
    WellBoreHeader_api,
    WellBoreTrajectory_api,
    WellCuttingPlane_api,
    WellSurfaceIntersectionData_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGetWellHeaders(caseUuid: string | undefined): UseQueryResult<WellBoreHeader_api[]> {
    return useQuery({
        queryKey: ["getWellHeaders", caseUuid],
        queryFn: () => apiService.well.getWellHeaders(caseUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: STALE_TIME,
        enabled: caseUuid ? true : false,
    });
}

export function useGetWellTrajectories(wellUuids: string[] | undefined): UseQueryResult<WellBoreTrajectory_api[]> {
    return useQuery({
        queryKey: ["getWellTrajectories", wellUuids],
        queryFn: () => apiService.well.getWellTrajectories(wellUuids ?? []),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: wellUuids ? true : false,
    });
}

export function useGetFieldWellsTrajectories(caseUuid: string | undefined): UseQueryResult<WellBoreTrajectory_api[]> {
    return useQuery({
        queryKey: ["getFieldWellsTrajectories", caseUuid],
        queryFn: () => apiService.well.getFieldWellTrajectories(caseUuid ?? ""),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: caseUuid ? true : false,
    });
}
export function useSurfaceIntersectionsQuery(
    surfaceAddress: SurfaceAddress | null,
    wellCuttingPlanes: WellCuttingPlane_api[] | null,
    enabled: boolean
): UseQueryResult<WellSurfaceIntersectionData_api[]> {
    function dummyApiCall(): Promise<SurfaceIntersectionData_api[]> {
        return new Promise((_resolve, reject) => {
            reject(null);
        });
    }

    if (!surfaceAddress || !wellCuttingPlanes || wellCuttingPlanes.length === 0) {
        return useQuery({
            queryKey: ["surfaceIntersectionsQuery_DUMMY_ALWAYS_DISABLED"],
            queryFn: () => dummyApiCall,
            enabled: false,
        });
    }
    console.log(surfaceAddress);
    console.log(wellCuttingPlanes);
    let queryFn: QueryFunction<WellSurfaceIntersectionData_api[]> | null = null;
    let queryKey: QueryKey | null = null;

    let bodyCuttingPlane: Body_get_surface_intersections_api = { well_cutting_planes: wellCuttingPlanes };
    // Static, per realization surface
    if (surfaceAddress.addressType === "realization") {
        queryKey = [
            "surfaceIntersectionsQuery",
            surfaceAddress.caseUuid,
            surfaceAddress.ensemble,
            surfaceAddress.name,
            surfaceAddress.attribute,
            bodyCuttingPlane,
        ];
        queryFn = () =>
            apiService.surface.getSurfaceIntersections(
                surfaceAddress.caseUuid,
                surfaceAddress.ensemble,
                surfaceAddress.name,
                surfaceAddress.attribute,
                bodyCuttingPlane
            );
    } else {
        throw new Error("Invalid surface address type");
    }

    return useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: enabled,
    });
}

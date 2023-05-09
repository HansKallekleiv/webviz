import { GridGeometry } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryFunction, QueryKey, UseQueryResult, useQuery } from "@tanstack/react-query";


const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useGridGeometry(): UseQueryResult<GridGeometry> {
    return useQuery({
        queryKey: ["getGridGeometry"],
        queryFn: () => apiService.grid.gridGeometry(),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
    });
}

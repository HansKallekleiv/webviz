import { SurfaceDataPng_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { QueryKey, useQueries } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type IndexedSurfaceData = {
    index: number;
    surfaceData: SurfaceDataPng_api | null;
};
export type IndexedSurfaceDataQueryResults = {
    data: IndexedSurfaceData[];
    isFetching: boolean;
};

export function useSurfaceDataSetQueryByAddresses(
    surfaceAddresses: Array<SurfaceAddress | null>
): IndexedSurfaceDataQueryResults {
    const queryResults = useQueries({
        queries: surfaceAddresses.map((surfAddr: SurfaceAddress | null) => {
            let queryKey: QueryKey = ["dummy"];
            let queryFn: () => Promise<SurfaceDataPng_api> | null = () => null;
            if (surfAddr === null) {
                return {
                    queryKey,
                    queryFn,
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                };
            }
            if (surfAddr.addressType === "realization") {
                queryKey = [
                    "getRealizationSurfaceDataAsPng",
                    surfAddr.caseUuid,
                    surfAddr.ensemble,
                    surfAddr.realizationNum,
                    surfAddr.name,
                    surfAddr.attribute,
                    surfAddr.isoDateOrInterval,
                ];
                queryFn = () =>
                    apiService.surface.getRealizationSurfaceDataAsPng(
                        surfAddr.caseUuid,
                        surfAddr.ensemble,
                        surfAddr.realizationNum,
                        surfAddr.name,
                        surfAddr.attribute,
                        surfAddr.isoDateOrInterval
                    );
            } else if (surfAddr.addressType === "statistical") {
                queryKey = [
                    "getStatisticalSurfaceDataAsPng",
                    surfAddr.caseUuid,
                    surfAddr.ensemble,
                    surfAddr.statisticFunction,
                    surfAddr.name,
                    surfAddr.attribute,
                    surfAddr.isoDateOrInterval,
                ];
                queryFn = () =>
                    apiService.surface.getStatisticalSurfaceDataAsPng(
                        surfAddr.caseUuid,
                        surfAddr.ensemble,
                        surfAddr.statisticFunction,
                        surfAddr.name,
                        surfAddr.attribute,
                        surfAddr.isoDateOrInterval
                    );
            } else if (surfAddr.addressType === "observation") {
                queryKey = [
                    "getObservationSurfaceDataAsPng",
                    surfAddr.caseUuid,
                    surfAddr.ensemble,
                    surfAddr.name,
                    surfAddr.attribute,
                    surfAddr.isoDateOrInterval,
                ];
                queryFn = () =>
                    apiService.surface.getObservationSurfaceDataAsPng(
                        surfAddr.caseUuid,
                        surfAddr.ensemble,
                        surfAddr.name,
                        surfAddr.attribute,
                        surfAddr.isoDateOrInterval
                    );
            }
            return {
                queryKey,
                queryFn,
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            };
        }),
    });

    const data: IndexedSurfaceDataQueryResults["data"] = queryResults.map((result, index) => ({
        index: index,
        surfaceData: result.data ?? null,
    }));

    const isFetching = queryResults.some((result) => result.isFetching);

    return {
        data,
        isFetching,
    };
}

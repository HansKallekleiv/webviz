import { SurfaceMeta_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type EnsembleSetSurfaceMetas = {
    data: Array<{
        ensembleIdent: EnsembleIdent;
        surfaceMetas?: SurfaceMeta_api[];
    }>;
    isFetching: boolean;
};
export function useEnsembleSetSurfaceMetaQuery(ensembleIdents: EnsembleIdent[]): EnsembleSetSurfaceMetas {
    return useQueries({
        queries: ensembleIdents.map((ensembleIdent) => ({
            queryKey: ["getSurfaceDirectory", ensembleIdent?.toString()],
            queryFn: () => {
                const caseUuid = ensembleIdent?.getCaseUuid();
                const ensembleName = ensembleIdent?.getEnsembleName();
                return apiService.surface.getSurfaceDirectory(caseUuid ?? "", ensembleName ?? "");
            },
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: Boolean(ensembleIdent),
        })),
        combine: (results: UseQueryResult<Array<SurfaceMeta_api>>[]) => ({
            data: results.map((result, index) => ({
                ensembleIdent: ensembleIdents[index],
                surfaceMetas: result.data,
            })),
            isFetching: results.some((result) => result.isFetching),
        }),
    });
}

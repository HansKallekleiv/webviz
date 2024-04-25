import { InplaceVolumetricResponseNames_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import {
    CombinedInplaceVolDataEnsembleSetResults,
    InplaceVolDataEnsembleSet,
    InplaceVolDataResultSet,
} from "@modules/InplaceVolumetrics/typesAndEnums";
import { useQueries } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;
export function useInplaceDataResultsQuery(
    ensembleIdents: EnsembleIdent[],
    tableName: string | null,
    responseNames: InplaceVolumetricResponseNames_api[]
): CombinedInplaceVolDataEnsembleSetResults {
    return useQueries({
        queries: ensembleIdents.flatMap((ensembleIdent) =>
            responseNames.map((responseName) =>
                createQueryForInplaceDataResults(ensembleIdent, tableName, responseName)
            )
        ),
        combine: (results) => {
            const ensembleSetData: InplaceVolDataEnsembleSet[] = [];

            ensembleIdents.forEach((ensembleIdent, ensembleIndex) => {
                const responseSetData: InplaceVolDataResultSet[] = [];
                responseNames.forEach((responseName, responseIndex) => {
                    const result = results[ensembleIndex * responseNames.length + responseIndex];
                    responseSetData.push({
                        responseName: responseName.toString(), // Assuming .toString() is suitable for your use case
                        data: result.data || null,
                    });
                });

                ensembleSetData.push({
                    ensembleIdentString: ensembleIdent?.toString() || "",
                    responseSetData: responseSetData,
                });
            });

            return {
                someQueriesFailed: results.some((result) => result.isError),
                allQueriesFailed: results.every((result) => result.isError),
                isFetching: results.some((result) => result.isFetching),
                ensembleSetData: ensembleSetData,
            };
        },
    });
}

export function createQueryForInplaceDataResults(
    ensembleIdent: EnsembleIdent,
    tableName: string | null,
    responseName: InplaceVolumetricResponseNames_api | null
) {
    return {
        queryKey: ["getInplaceDataResults", ensembleIdent.toString(), tableName, responseName],
        queryFn: () =>
            apiService.inplaceVolumetrics.getResultDataPerRealization(
                ensembleIdent.getCaseUuid(),
                ensembleIdent.getEnsembleName(),
                tableName ?? "",
                responseName ?? InplaceVolumetricResponseNames_api.STOIIP_OIL
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(ensembleIdent && tableName && responseName),
    };
}

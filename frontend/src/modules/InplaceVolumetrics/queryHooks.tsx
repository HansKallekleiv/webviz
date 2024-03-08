import {
    Body_get_result_data_per_realization_api,
    EnsembleInfo_api,
    InplaceVolumetricData_api,
    InplaceVolumetricResponseNames_api,
    InplaceVolumetricTableDefinition_api,
    InplaceVolumetricsCategoryValues_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useEnsemblesQuery(caseUuid: string | null): UseQueryResult<Array<EnsembleInfo_api>> {
    return useQuery({
        queryKey: ["getEnsembles", caseUuid],
        queryFn: () => apiService.explore.getEnsembles(caseUuid ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid ? true : false,
    });
}

export function useTableDescriptionsQuery(
    ensemble: EnsembleIdent | null,
    allowEnable: boolean
): UseQueryResult<Array<InplaceVolumetricTableDefinition_api>> {
    return useQuery({
        queryKey: ["getTableNamesAndDescriptions", ensemble],
        queryFn: () =>
            apiService.inplaceVolumetrics.getTableDefinitions(
                ensemble?.getCaseUuid() ?? "",
                ensemble?.getEnsembleName() ?? ""
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: allowEnable && ensemble ? true : false,
    });
}

export function useRealizationsResponseQuery(
    caseUuid: string | null,
    ensembleName: string | null,
    tableName: string | null,
    responseName: InplaceVolumetricResponseNames_api | null,
    realizations: Array<number> | null,
    categoriesFilter: InplaceVolumetricsCategoryValues_api[] | null,
    allowEnable: boolean
): UseQueryResult<InplaceVolumetricData_api> {
    const responseBody: Body_get_result_data_per_realization_api = {
        categorical_filter: categoriesFilter || [],
    };

    const isQueryEnabled = [
        caseUuid,
        ensembleName,
        tableName,
        responseName,
        realizations,
        categoriesFilter,
        allowEnable,
    ].every(Boolean);

    return useQuery({
        queryKey: [
            "getVolumetricDataResultDataPerRealization",
            caseUuid,
            ensembleName,
            tableName,
            responseName,
            realizations,
            JSON.stringify(categoriesFilter),
        ],
        queryFn: () =>
            apiService.inplaceVolumetrics.getResultDataPerRealization(
                caseUuid ?? "",
                ensembleName ?? "",
                tableName ?? "",
                responseName ?? InplaceVolumetricResponseNames_api.STOIIP_OIL,
                realizations ?? [],
                responseBody
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: isQueryEnabled,
    });
}

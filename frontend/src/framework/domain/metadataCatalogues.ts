import type { QueryClient } from "@tanstack/query-core";

import type { InplaceVolumesTableDefinition_api, VectorDescription_api } from "@api";
import {
    getDeltaEnsembleVectorListOptions,
    getInplaceTableDefinitionsOptions,
    getVectorListOptions,
} from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

export type VectorListCatalogue = {
    ensemble: RegularEnsembleIdent | DeltaEnsembleIdent;
    vectors: readonly VectorDescription_api[];
};

export type InplaceVolumesTableDefinitionsCatalogue = {
    ensemble: RegularEnsembleIdent;
    tableDefinitions: readonly InplaceVolumesTableDefinition_api[];
};

export async function fetchVectorListCatalogue(
    queryClient: QueryClient,
    ensemble: RegularEnsembleIdent | DeltaEnsembleIdent,
    abortSignal?: AbortSignal,
): Promise<VectorListCatalogue> {
    if (ensemble instanceof DeltaEnsembleIdent) {
        const comparison = ensemble.getComparisonEnsembleIdent();
        const reference = ensemble.getReferenceEnsembleIdent();
        const vectors = await queryClient.fetchQuery({
            ...getDeltaEnsembleVectorListOptions({
                query: {
                    comparison_case_uuid: comparison.getCaseUuid(),
                    comparison_ensemble_name: comparison.getEnsembleName(),
                    reference_case_uuid: reference.getCaseUuid(),
                    reference_ensemble_name: reference.getEnsembleName(),
                    include_derived_vectors: true,
                    ...makeCacheBustingQueryParam(comparison, reference),
                },
                signal: abortSignal,
            }),
        });
        return { ensemble, vectors };
    }

    const vectors = await queryClient.fetchQuery({
        ...getVectorListOptions({
            query: {
                case_uuid: ensemble.getCaseUuid(),
                ensemble_name: ensemble.getEnsembleName(),
                include_derived_vectors: true,
                ...makeCacheBustingQueryParam(ensemble),
            },
            signal: abortSignal,
        }),
    });
    return { ensemble, vectors };
}

export async function fetchInplaceVolumesTableDefinitionsCatalogue(
    queryClient: QueryClient,
    ensemble: RegularEnsembleIdent,
    abortSignal?: AbortSignal,
): Promise<InplaceVolumesTableDefinitionsCatalogue> {
    const tableDefinitions = await queryClient.fetchQuery({
        ...getInplaceTableDefinitionsOptions({
            query: {
                case_uuid: ensemble.getCaseUuid(),
                ensemble_name: ensemble.getEnsembleName(),
                ...makeCacheBustingQueryParam(ensemble),
            },
            signal: abortSignal,
        }),
    });
    return { ensemble, tableDefinitions };
}
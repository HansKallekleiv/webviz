import type { QueryObserverResult } from "@tanstack/query-core";

import type { InplaceVolumesTableDefinition_api, ResultWithWarnings } from "@api";
import {
    getInplaceTableDefinitions,
    getInplaceTableDefinitionsOptions,
    InplaceVolumesTableSource_api,
    withWarnings,
} from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { atomWithQueries, computeQueriesDependenciesState } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import { selectedEnsembleIdentsAtom } from "./persistableFixableAtoms";

export type TableDefinitionsQueryResult = {
    data: {
        ensembleIdent: RegularEnsembleIdent;
        tableDefinitions: InplaceVolumesTableDefinition_api[];
    }[];
    isLoading: boolean;
    errors: Error[];
    /**
     * For the settings' computeDependenciesState - unlike isLoading, it isn't "loaded" while a query is disabled or
     * has no result yet, so that nothing settles on the empty definitions of that moment.
     */
    dependenciesState: PersistableAtomDependenciesState;
};

export const tableDefinitionsQueryAtom = atomWithQueries((get) => {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);

    const queries = selectedEnsembleIdents.map((ensembleIdent) => {
        const options = withWarnings(
            getInplaceTableDefinitionsOptions({
                query: {
                    case_uuid: ensembleIdent.getCaseUuid(),
                    ensemble_name: ensembleIdent.getEnsembleName(),
                    ...makeCacheBustingQueryParam(ensembleIdent),
                },
            }),
            getInplaceTableDefinitions,
        );
        return () => ({ ...options, enabled: ensembleIdentsValid });
    });

    return {
        queries,
        combine: (
            results: QueryObserverResult<ResultWithWarnings<InplaceVolumesTableDefinition_api[]>, Error>[],
        ): TableDefinitionsQueryResult => {
            const tableDefinitionsPerEnsembleIdent: TableDefinitionsQueryResult["data"] = results.map(
                (result, index) => ({
                    ensembleIdent: selectedEnsembleIdents[index],
                    // Deprecated module kept for saved-session compatibility; restrict to static tables.
                    tableDefinitions: (result.data?.value ?? []).filter(
                        (def) => def.tableSource === InplaceVolumesTableSource_api.STATIC,
                    ),
                }),
            );
            return {
                data: tableDefinitionsPerEnsembleIdent,
                isLoading: results.some((result) => result.isLoading),
                errors: results.filter((result) => result.isError).map((result) => result.error!),
                dependenciesState: computeQueriesDependenciesState(results),
            };
        },
    };
});

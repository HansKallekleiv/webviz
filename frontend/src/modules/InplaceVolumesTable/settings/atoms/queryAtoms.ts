import type { QueryObserverResult } from "@tanstack/query-core";

import type { InplaceVolumesTableDefinition_api, ResultWithWarnings } from "@api";
import { getInplaceTableDefinitions, getInplaceTableDefinitionsOptions, withWarnings } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { atomWithQueries, computeQueriesDependenciesState } from "@framework/utils/atomUtils";
import { expandToRegularEnsembleIdents } from "@framework/utils/ensembleIdentUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { makeDistinguishableEnsembleDisplayNameFunc } from "@modules/_shared/ensembleNameUtils";

import { selectedEnsembleIdentsAtom } from "./persistableFixableAtoms";

export type TableDefinitionsQueryResult = {
    data: {
        ensembleIdent: RegularEnsembleIdent;
        tableDefinitions: InplaceVolumesTableDefinition_api[];
    }[];
    isLoading: boolean;
    errors: Error[];
    warnings: string[];
    /**
     * For the settings' computeDependenciesState - unlike isLoading, it isn't "loaded" while a query is disabled or
     * has no result yet, so that nothing settles on the empty definitions of that moment.
     */
    dependenciesState: PersistableAtomDependenciesState;
};

export const tableDefinitionsQueryAtom = atomWithQueries((get) => {
    const { value: selectedEnsembleIdents, isValidInContext: ensembleIdentsValid } = get(selectedEnsembleIdentsAtom);
    const ensembleSet = get(EnsembleSetAtom);
    const makeEnsembleDisplayName = makeDistinguishableEnsembleDisplayNameFunc(ensembleSet);

    const regularEnsembleIdents = expandToRegularEnsembleIdents(selectedEnsembleIdents);

    const queries = regularEnsembleIdents.map((ensembleIdent) => {
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
                    ensembleIdent: regularEnsembleIdents[index],
                    tableDefinitions: result.data?.value ?? [],
                }),
            );
            const warnings: string[] = [];
            for (const [index, result] of results.entries()) {
                if (result.data && ensembleIdentsValid) {
                    const ensembleName = makeEnsembleDisplayName(regularEnsembleIdents[index]);
                    warnings.push(...result.data.warnings.map((warning) => `${ensembleName}: ${warning}`));
                }
            }
            return {
                data: tableDefinitionsPerEnsembleIdent,
                isLoading: results.some((result) => result.isLoading),
                errors: results.filter((result) => result.isError).map((result) => result.error!),
                warnings,
                dependenciesState: computeQueriesDependenciesState(results),
            };
        },
    };
});

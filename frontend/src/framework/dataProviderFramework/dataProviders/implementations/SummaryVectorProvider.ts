import { isEqual } from "lodash-es";

import {
    Frequency_api,
    getDeltaEnsembleRealizationsVectorDataOptions,
    getDeltaEnsembleStatisticalVectorDataOptions,
    getRealizationsVectorDataOptions,
    getStatisticalVectorDataOptions,
    type VectorRealizationData_api,
    type VectorStatisticData_api,
} from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { DataKind, SummaryVectorRepresentation, type SummaryVectorAddress } from "@framework/domain/DataAddress";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

import type { Read } from "../../delegates/_utils/Dependency";
import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { Representation } from "../../settings/implementations/RepresentationSetting";
import { Setting } from "../../settings/settingsDefinitions";
import { makeVectorListSharedResult } from "../metadataCatalogueDependencies";
import { VisualizationKind } from "../visualizationKinds";

const summaryVectorSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATIONS,
    Setting.VECTOR_NAME,
    Setting.VECTOR_RESAMPLING_FREQUENCY,
    Setting.REPRESENTATION,
] as const;

export type SummaryVectorSettings = typeof summaryVectorSettings;
type SettingsWithTypes = MakeSettingTypesMap<SummaryVectorSettings>;
type EnsembleIdent = RegularEnsembleIdent | DeltaEnsembleIdent;

export type SummaryVectorData =
    | { address: SummaryVectorAddress; realizations: readonly VectorRealizationData_api[]; statistics?: never }
    | { address: SummaryVectorAddress; realizations?: never; statistics: VectorStatisticData_api };

export class SummaryVectorProvider implements CustomDataProviderImplementation<SummaryVectorSettings, SummaryVectorData> {
    settings = summaryVectorSettings;
    supportsEnsembleKinds = ["regular", "delta"] as const;
    compatibleVisualizationKinds = [VisualizationKind.TIME_SERIES] as const;

    getDefaultName(): string {
        return "Summary Vector";
    }

    doSettingsChangesRequireDataRefetch(previous: SettingsWithTypes | null, next: SettingsWithTypes): boolean {
        return !isEqual(previous, next);
    }

    makeValueRange({ getData }: DataProviderAccessors<SummaryVectorSettings, SummaryVectorData>) {
        const data = getData();
        const values = data?.realizations
            ? data.realizations.flatMap((item) => item.values)
            : data?.statistics.valueObjects.flatMap((item) => item.values);
        return values?.length ? ([Math.min(...values), Math.max(...values)] as const) : null;
    }

    areCurrentSettingsValid({ getSetting }: DataProviderAccessors<SummaryVectorSettings, SummaryVectorData>): boolean {
        const representation = getSetting(Setting.REPRESENTATION);
        return Boolean(
            getSetting(Setting.ENSEMBLE) &&
                getSetting(Setting.VECTOR_NAME) &&
                representation &&
                (representation !== Representation.REALIZATION || getSetting(Setting.REALIZATIONS)?.length) &&
                (representation === Representation.REALIZATION ||
                    getSetting(Setting.VECTOR_RESAMPLING_FREQUENCY) !== null),
        );
    }

    setupBindings(context: SetupBindingsContext<SummaryVectorSettings>): void {
        const { setting, workbenchSession } = context;
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read: (read) => ({ fieldId: read.globalSetting("fieldId") }),
            resolve({ fieldId }) {
                return workbenchSession
                    .getEnsembleSet()
                    .getEnsembleArray()
                    .filter((ensemble) => !fieldId || ensemble.getFieldIdentifiers().includes(fieldId))
                    .map((ensemble) => ensemble.getIdent()) as unknown as RegularEnsembleIdent[];
            },
        });

        const vectorCatalogue = makeVectorListSharedResult(context, (read) =>
            read.localSetting(Setting.ENSEMBLE) as Read<EnsembleIdent | null>,
        );
        setting(Setting.VECTOR_NAME).bindValueConstraints({
            read: (read) => ({ catalogue: read.sharedResult(vectorCatalogue) }),
            resolve: ({ catalogue }) => catalogue?.vectors.map((item) => item.name) ?? [],
        });
        setting(Setting.VECTOR_RESAMPLING_FREQUENCY).bindValueConstraints({
            read: (read) => ({ ensemble: read.localSetting(Setting.ENSEMBLE) }),
            resolve: ({ ensemble }) => [
                ...(ensemble instanceof DeltaEnsembleIdent ? [] : [null]),
                ...Object.values(Frequency_api),
            ],
        });
        setting(Setting.REPRESENTATION).bindValueConstraints({
            resolve: () => [Representation.REALIZATION, Representation.ENSEMBLE_STATISTICS, Representation.FANCHART],
        });
        setting(Setting.REALIZATIONS).bindValueConstraints({
            read: (read) => ({
                ensemble: read.localSetting(Setting.ENSEMBLE),
                realizationFilterFunction: read.globalSetting("realizationFilterFunction"),
            }),
            resolve: ({ ensemble, realizationFilterFunction }) =>
                ensemble ? [...realizationFilterFunction(ensemble as EnsembleIdent)] : [],
        });
        setting(Setting.REALIZATIONS).bindAttributes({
            read: (read) => ({ representation: read.localSetting(Setting.REPRESENTATION) }),
            resolve: ({ representation }) => {
                const visible = representation === Representation.REALIZATION;
                return { visible, enabled: visible };
            },
        });
    }

    async fetchData({ getSetting, fetchQuery }: FetchDataParams<SummaryVectorSettings, SummaryVectorData>) {
        const ensemble = getSetting(Setting.ENSEMBLE) as EnsembleIdent | null;
        const vectorName = getSetting(Setting.VECTOR_NAME);
        const frequency = getSetting(Setting.VECTOR_RESAMPLING_FREQUENCY);
        const representation = getSetting(Setting.REPRESENTATION);
        const realizations = getSetting(Setting.REALIZATIONS);
        if (!ensemble || !vectorName || !representation) {
            throw new Error("Invalid summary vector settings");
        }

        const address: SummaryVectorAddress = {
            kind: DataKind.SUMMARY_VECTOR,
            ensemble,
            vectorName,
            frequency,
            representation: mapRepresentation(representation),
        };
        const encodedRealizations = realizations?.length ? encodeAsUintListStr(realizations) : null;

        if (representation === Representation.REALIZATION) {
            if (ensemble instanceof DeltaEnsembleIdent) {
                return {
                    address,
                    realizations: await fetchQuery(
                        getDeltaEnsembleRealizationsVectorDataOptions({
                            query: makeDeltaQuery(ensemble, vectorName, frequency, encodedRealizations),
                        }),
                    ),
                };
            }
            return {
                address,
                realizations: await fetchQuery(
                    getRealizationsVectorDataOptions({
                        query: {
                            case_uuid: ensemble.getCaseUuid(),
                            ensemble_name: ensemble.getEnsembleName(),
                            vector_name: vectorName,
                            resampling_frequency: frequency,
                            realizations_encoded_as_uint_list_str: encodedRealizations,
                            ...makeCacheBustingQueryParam(ensemble),
                        },
                    }),
                ),
            };
        }

        if (!frequency) {
            throw new Error("Statistical vector data requires a resampling frequency");
        }
        if (ensemble instanceof DeltaEnsembleIdent) {
            return {
                address,
                statistics: await fetchQuery(
                    getDeltaEnsembleStatisticalVectorDataOptions({
                        query: makeDeltaQuery(ensemble, vectorName, frequency, encodedRealizations),
                    }),
                ),
            };
        }
        return {
            address,
            statistics: await fetchQuery(
                getStatisticalVectorDataOptions({
                    query: {
                        case_uuid: ensemble.getCaseUuid(),
                        ensemble_name: ensemble.getEnsembleName(),
                        vector_name: vectorName,
                        resampling_frequency: frequency,
                        realizations_encoded_as_uint_list_str: encodedRealizations,
                        ...makeCacheBustingQueryParam(ensemble),
                    },
                }),
            ),
        };
    }
}

function mapRepresentation(representation: Representation): SummaryVectorRepresentation {
    if (representation === Representation.REALIZATION) return SummaryVectorRepresentation.REALIZATIONS;
    if (representation === Representation.FANCHART) return SummaryVectorRepresentation.FANCHART;
    return SummaryVectorRepresentation.STATISTICS;
}

function makeDeltaQuery(
    ensemble: DeltaEnsembleIdent,
    vectorName: string,
    frequency: Frequency_api | null,
    realizations: string | null,
) {
    if (!frequency) throw new Error("Delta vector data requires a resampling frequency");
    const comparison = ensemble.getComparisonEnsembleIdent();
    const reference = ensemble.getReferenceEnsembleIdent();
    return {
        comparison_case_uuid: comparison.getCaseUuid(),
        comparison_ensemble_name: comparison.getEnsembleName(),
        reference_case_uuid: reference.getCaseUuid(),
        reference_ensemble_name: reference.getEnsembleName(),
        vector_name: vectorName,
        resampling_frequency: frequency,
        realizations_encoded_as_uint_list_str: realizations,
        ...makeCacheBustingQueryParam(comparison, reference),
    };
}
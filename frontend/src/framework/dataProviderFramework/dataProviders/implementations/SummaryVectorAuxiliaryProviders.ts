import { isEqual } from "lodash-es";

import {
    Frequency_api,
    getHistoricalVectorDataOptions,
    getSummaryObservationsOptions,
    type SummaryVectorDateObservation_api,
    type VectorHistoricalData_api,
} from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import type {
    CustomDataProviderImplementation,
    DataProviderAccessors,
    FetchDataParams,
} from "../../interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { Setting } from "../../settings/settingsDefinitions";
import { makeVectorListSharedResult } from "../metadataCatalogueDependencies";
import { VisualizationKind } from "../visualizationKinds";

const historySettings = [Setting.ENSEMBLE, Setting.VECTOR_NAME, Setting.VECTOR_RESAMPLING_FREQUENCY] as const;
const observationSettings = [Setting.ENSEMBLE, Setting.VECTOR_NAME] as const;

export type SummaryVectorHistorySettings = typeof historySettings;
export type SummaryVectorObservationSettings = typeof observationSettings;

export type SummaryVectorHistoryData = {
    ensemble: RegularEnsembleIdent;
    vectorName: string;
    history: VectorHistoricalData_api;
};

export type SummaryVectorObservationData = {
    ensemble: RegularEnsembleIdent;
    vectorName: string;
    observations: readonly SummaryVectorDateObservation_api[];
};

export class SummaryVectorHistoryProvider
    implements CustomDataProviderImplementation<typeof historySettings, SummaryVectorHistoryData>
{
    settings = historySettings;
    compatibleVisualizationKinds = [VisualizationKind.TIME_SERIES] as const;

    getDefaultName(): string {
        return "Summary Vector History";
    }

    doSettingsChangesRequireDataRefetch(
        previous: MakeSettingTypesMap<typeof historySettings> | null,
        next: MakeSettingTypesMap<typeof historySettings>,
    ): boolean {
        return !isEqual(previous, next);
    }

    areCurrentSettingsValid({ getSetting }: DataProviderAccessors<typeof historySettings, SummaryVectorHistoryData>) {
        return Boolean(getSetting(Setting.ENSEMBLE) && getSetting(Setting.VECTOR_NAME));
    }

    makeValueRange({ getData }: DataProviderAccessors<typeof historySettings, SummaryVectorHistoryData>) {
        const values = getData()?.history.values;
        return values?.length ? ([Math.min(...values), Math.max(...values)] as const) : null;
    }

    setupBindings(context: SetupBindingsContext<typeof historySettings>): void {
        bindRegularEnsembles(context);
        const catalogue = makeVectorListSharedResult(context, (read) => read.localSetting(Setting.ENSEMBLE));
        context.setting(Setting.VECTOR_NAME).bindValueConstraints({
            read: (read) => ({ catalogue: read.sharedResult(catalogue) }),
            resolve: ({ catalogue }) =>
                catalogue?.vectors.filter((item) => item.hasHistorical).map((item) => item.name) ?? [],
        });
        context.setting(Setting.VECTOR_RESAMPLING_FREQUENCY).bindValueConstraints({
            resolve: () => [null, ...Object.values(Frequency_api)],
        });
    }

    async fetchData({ getSetting, fetchQuery }: FetchDataParams<typeof historySettings, SummaryVectorHistoryData>) {
        const ensemble = getSetting(Setting.ENSEMBLE);
        const vectorName = getSetting(Setting.VECTOR_NAME);
        if (!ensemble || !vectorName) throw new Error("Invalid summary vector history settings");
        const history = await fetchQuery(
            getHistoricalVectorDataOptions({
                query: {
                    case_uuid: ensemble.getCaseUuid(),
                    ensemble_name: ensemble.getEnsembleName(),
                    non_historical_vector_name: vectorName,
                    resampling_frequency: getSetting(Setting.VECTOR_RESAMPLING_FREQUENCY),
                    ...makeCacheBustingQueryParam(ensemble),
                },
            }),
        );
        return { ensemble, vectorName, history };
    }
}

export class SummaryVectorObservationsProvider
    implements CustomDataProviderImplementation<typeof observationSettings, SummaryVectorObservationData>
{
    settings = observationSettings;
    compatibleVisualizationKinds = [VisualizationKind.TIME_SERIES] as const;

    getDefaultName(): string {
        return "Summary Vector Observations";
    }

    doSettingsChangesRequireDataRefetch(
        previous: MakeSettingTypesMap<typeof observationSettings> | null,
        next: MakeSettingTypesMap<typeof observationSettings>,
    ): boolean {
        return !isEqual(previous, next);
    }

    areCurrentSettingsValid({ getSetting }: DataProviderAccessors<typeof observationSettings, SummaryVectorObservationData>) {
        return Boolean(getSetting(Setting.ENSEMBLE) && getSetting(Setting.VECTOR_NAME));
    }

    makeValueRange({ getData }: DataProviderAccessors<typeof observationSettings, SummaryVectorObservationData>) {
        const values = getData()?.observations.map((item) => item.value);
        return values?.length ? ([Math.min(...values), Math.max(...values)] as const) : null;
    }

    setupBindings(context: SetupBindingsContext<typeof observationSettings>): void {
        bindRegularEnsembles(context);
        const catalogue = makeVectorListSharedResult(context, (read) => read.localSetting(Setting.ENSEMBLE));
        context.setting(Setting.VECTOR_NAME).bindValueConstraints({
            read: (read) => ({ catalogue: read.sharedResult(catalogue) }),
            resolve: ({ catalogue }) => catalogue?.vectors.map((item) => item.name) ?? [],
        });
    }

    async fetchData({ getSetting, fetchQuery }: FetchDataParams<typeof observationSettings, SummaryVectorObservationData>) {
        const ensemble = getSetting(Setting.ENSEMBLE);
        const vectorName = getSetting(Setting.VECTOR_NAME);
        if (!ensemble || !vectorName) throw new Error("Invalid summary vector observation settings");
        const allObservations = await fetchQuery(
            getSummaryObservationsOptions({
                query: {
                    case_uuid: ensemble.getCaseUuid(),
                    ensemble_name: ensemble.getEnsembleName(),
                    ...makeCacheBustingQueryParam(ensemble),
                },
            }),
        );
        return {
            ensemble,
            vectorName,
            observations: allObservations.find((item) => item.vector_name === vectorName)?.observations ?? [],
        };
    }
}

function bindRegularEnsembles<TSettings extends typeof historySettings | typeof observationSettings>(
    context: SetupBindingsContext<TSettings>,
): void {
    context.setting(Setting.ENSEMBLE).bindValueConstraints({
        read: (read) => ({ fieldId: read.globalSetting("fieldId"), ensembles: read.globalSetting("ensembles") }),
        resolve: ({ fieldId, ensembles }) =>
            ensembles.filter((ensemble) => !fieldId || ensemble.getFieldIdentifiers().includes(fieldId)).map((item) => item.getIdent()),
    });
}
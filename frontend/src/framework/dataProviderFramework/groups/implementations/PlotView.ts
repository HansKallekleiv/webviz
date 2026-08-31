import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { DataProviderType } from "../../dataProviders/dataProviderTypes";
import { VisualizationKind } from "../../dataProviders/visualizationKinds";
import type { DataProvider } from "../../framework/DataProvider/DataProvider";
import type { CustomGroupImplementationWithSettings } from "../../interfacesAndTypes/customGroupImplementation";
import type { SetupBasicBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import { Setting } from "../../settings/settingsDefinitions";
import { PlotDimension } from "../../visualization/plotTypes";

const plotViewSettings = [Setting.VISUALIZATION_KIND, Setting.SUBPLOT_BY, Setting.COLOR_BY] as const;

export type PlotViewSettings = typeof plotViewSettings;

export class PlotView implements CustomGroupImplementationWithSettings<PlotViewSettings> {
    settings = plotViewSettings;

    getDefaultName(): string {
        return "Plot";
    }

    getEmptyContentMessage(): string {
        return "Add a compatible data provider to create a plot";
    }

    getDefaultSettingsValues() {
        return {
            visualizationKind: VisualizationKind.TIME_SERIES,
            subplotBy: PlotDimension.NONE,
            colorBy: PlotDimension.ENSEMBLE,
        };
    }

    setupBindings(context: SetupBasicBindingsContext<PlotViewSettings>): void {
        context.setting(Setting.VISUALIZATION_KIND).bindValueConstraints({
            read: (read) => ({ dataRevision: read.globalSetting("dataRevision") }),
            resolve: ({ dataRevision }) => {
                void dataRevision;
                return getCompatibleVisualizationKinds(context.getDescendantDataProviders());
            },
        });
        context.setting(Setting.SUBPLOT_BY).bindValueConstraints({
            read: (read) => ({ dataRevision: read.globalSetting("dataRevision") }),
            resolve: ({ dataRevision }) => {
                void dataRevision;
                return [PlotDimension.NONE, ...getAvailablePlotDimensions(context)];
            },
        });
        context.setting(Setting.COLOR_BY).bindValueConstraints({
            read: (read) => ({ dataRevision: read.globalSetting("dataRevision") }),
            resolve: ({ dataRevision }) => {
                void dataRevision;
                return getAvailablePlotDimensions(context);
            },
        });
    }
}

export function getCompatibleVisualizationKinds(providers: readonly DataProvider<any, any>[]): VisualizationKind[] {
    if (providers.length === 0) return Object.values(VisualizationKind);
    return providers.reduce<VisualizationKind[]>((compatible, provider) => {
        const providerKinds = provider.getCompatibleVisualizationKinds() ?? [];
        return compatible.filter((kind) => providerKinds.includes(kind));
    }, Object.values(VisualizationKind));
}

function getAvailablePlotDimensions(context: SetupBasicBindingsContext<PlotViewSettings>): PlotDimension[] {
    const providers = context.getDescendantDataProviders();
    const dimensions = new Set<PlotDimension>([PlotDimension.ENSEMBLE, PlotDimension.PROVIDER]);

    for (const provider of providers) {
        if (
            provider.getType() === DataProviderType.SUMMARY_VECTOR ||
            provider.getType() === DataProviderType.SUMMARY_VECTOR_HISTORY ||
            provider.getType() === DataProviderType.SUMMARY_VECTOR_OBSERVATIONS
        ) {
            dimensions.add(PlotDimension.VECTOR);
        }
        if (provider.getType() === DataProviderType.INPLACE_VOLUMES) dimensions.add(PlotDimension.RESULT);
        const data = provider.getData();
        if (isRealizationTable(data)) {
            dimensions.add(PlotDimension.REALIZATION);
            for (const columnName of Object.keys(data.indexColumns)) {
                if (Object.values(PlotDimension).includes(columnName as PlotDimension)) {
                    dimensions.add(columnName as PlotDimension);
                }
            }
        }
        const ensemble = provider.getSettingsContextDelegate().getValues()[Setting.ENSEMBLE] as
            | RegularEnsembleIdent
            | null
            | undefined;
        const contributingEnsemble = context.workbenchSession
            .getEnsembleSet()
            .getEnsembleArray()
            .find((item) => ensemble?.equals(item.getIdent()));
        if (contributingEnsemble?.getSensitivities()) dimensions.add(PlotDimension.SENSITIVITY);
    }

    return [...dimensions].sort();
}

function isRealizationTable(value: unknown): value is { keyColumns: object; indexColumns: Record<string, unknown> } {
    return typeof value === "object" && value !== null && "keyColumns" in value && "indexColumns" in value;
}
import { isEqual } from "lodash-es";

import { ORDERED_VOLUME_DEFINITIONS } from "@assets/volumeDefinitions";

import {
    postGetAggregatedPerRealizationInplaceTableDataOptions,
    type InplaceVolumesTableDefinition_api,
    type InplaceVolumesTableDataPerFluidSelection_api,
} from "@api";
import { DataKind, type InplaceVolumesAddress } from "@framework/domain/DataAddress";
import { deriveSensitivityColumn, type IndexColumnValue, type RealizationTable } from "@framework/domain/RealizationTable";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";

import type { CustomDataProviderImplementation, DataProviderAccessors, FetchDataParams } from "../../interfacesAndTypes/customDataProviderImplementation";
import type { SetupBindingsContext } from "../../interfacesAndTypes/customSettingsHandler";
import type { MakeSettingTypesMap } from "../../interfacesAndTypes/utils";
import { Setting } from "../../settings/settingsDefinitions";
import { makeInplaceVolumesTableDefinitionsSharedResult } from "../metadataCatalogueDependencies";
import { VisualizationKind } from "../visualizationKinds";

const INDEX_SETTINGS = [Setting.ZONE, Setting.REGION, Setting.FACIES, Setting.LICENSE] as const;
const inplaceVolumesSettings = [
    Setting.ENSEMBLE,
    Setting.REALIZATIONS,
    Setting.GRID_NAME,
    Setting.INPLACE_RESULT,
    ...INDEX_SETTINGS,
] as const;

export type InplaceVolumesSettings = typeof inplaceVolumesSettings;
type SettingsWithTypes = MakeSettingTypesMap<InplaceVolumesSettings>;
export type InplaceVolumesStoredData = {
    tableDefinitions: readonly InplaceVolumesTableDefinition_api[];
};

export class InplaceVolumesProvider
    implements CustomDataProviderImplementation<InplaceVolumesSettings, RealizationTable, InplaceVolumesStoredData>
{
    settings = inplaceVolumesSettings;
    compatibleVisualizationKinds = [
        VisualizationKind.HISTOGRAM,
        VisualizationKind.BOX,
        VisualizationKind.BAR,
        VisualizationKind.CONVERGENCE,
        VisualizationKind.TABLE,
    ] as const;

    getDefaultName(): string {
        return "Inplace Volumes";
    }

    doSettingsChangesRequireDataRefetch(previous: SettingsWithTypes | null, next: SettingsWithTypes): boolean {
        return !isEqual(previous, next);
    }

    makeValueRange({ getData }: DataProviderAccessors<InplaceVolumesSettings, RealizationTable, InplaceVolumesStoredData>) {
        const values = getData()?.valueColumns.flatMap((column) => [...column.values]);
        return values?.length ? ([Math.min(...values), Math.max(...values)] as const) : null;
    }

    areCurrentSettingsValid({ getSetting }: DataProviderAccessors<InplaceVolumesSettings, RealizationTable, InplaceVolumesStoredData>): boolean {
        return Boolean(
            getSetting(Setting.ENSEMBLE) &&
                getSetting(Setting.REALIZATIONS)?.length &&
                getSetting(Setting.GRID_NAME) &&
                getSetting(Setting.INPLACE_RESULT) &&
                INDEX_SETTINGS.every((setting) => getSetting(setting) !== null),
        );
    }

    setupBindings(context: SetupBindingsContext<InplaceVolumesSettings, InplaceVolumesStoredData>): void {
        const { setting } = context;
        setting(Setting.ENSEMBLE).bindValueConstraints({
            read: (read) => ({ fieldId: read.globalSetting("fieldId"), ensembles: read.globalSetting("ensembles") }),
            resolve: ({ fieldId, ensembles }) =>
                ensembles.filter((ensemble) => !fieldId || ensemble.getFieldIdentifiers().includes(fieldId)).map((item) => item.getIdent()),
        });
        setting(Setting.REALIZATIONS).bindValueConstraints({
            read: (read) => ({
                ensemble: read.localSetting(Setting.ENSEMBLE),
                realizationFilterFunction: read.globalSetting("realizationFilterFunction"),
            }),
            resolve: ({ ensemble, realizationFilterFunction }) =>
                ensemble ? [...realizationFilterFunction(ensemble)] : [],
        });

        const catalogue = makeInplaceVolumesTableDefinitionsSharedResult(context, (read) =>
            read.localSetting(Setting.ENSEMBLE),
        );
        context.storedData("tableDefinitions").bindValue({
            read: (read) => ({ catalogue: read.sharedResult(catalogue) }),
            resolve: ({ catalogue }) => catalogue?.tableDefinitions ?? null,
        });
        setting(Setting.GRID_NAME).bindValueConstraints({
            read: (read) => ({ catalogue: read.sharedResult(catalogue) }),
            resolve: ({ catalogue }) => catalogue?.tableDefinitions.map((item) => item.tableName) ?? [],
        });
        setting(Setting.INPLACE_RESULT).bindValueConstraints({
            read: (read) => ({ catalogue: read.sharedResult(catalogue), gridName: read.localSetting(Setting.GRID_NAME) }),
            resolve: ({ catalogue, gridName }) =>
                catalogue?.tableDefinitions.find((item) => item.tableName === gridName)?.resultNames ?? [],
        });

        for (const indexSetting of INDEX_SETTINGS) {
            const indexColumn = indexSetting.toUpperCase();
            setting(indexSetting).bindValueConstraints({
                read: (read) => ({ catalogue: read.sharedResult(catalogue), gridName: read.localSetting(Setting.GRID_NAME) }),
                resolve: ({ catalogue, gridName }) =>
                    catalogue?.tableDefinitions
                        .find((item) => item.tableName === gridName)
                        ?.indicesWithValues.find((item) => item.indexColumn === indexColumn)?.values.map(String) ?? [],
            });
            setting(indexSetting).bindAttributes({
                read: (read) => ({ catalogue: read.sharedResult(catalogue), gridName: read.localSetting(Setting.GRID_NAME) }),
                resolve: ({ catalogue, gridName }) => {
                    const visible = Boolean(
                        catalogue?.tableDefinitions
                            .find((item) => item.tableName === gridName)
                            ?.indicesWithValues.some((item) => item.indexColumn === indexColumn),
                    );
                    return { visible, enabled: visible };
                },
            });
        }
    }

    async fetchData({ getSetting, getSettingValueConstraints, getStoredData, getWorkbenchSession, fetchQuery }: FetchDataParams<InplaceVolumesSettings, RealizationTable, InplaceVolumesStoredData>) {
        const ensemble = getSetting(Setting.ENSEMBLE);
        const gridName = getSetting(Setting.GRID_NAME);
        const resultName = getSetting(Setting.INPLACE_RESULT);
        if (!ensemble || !gridName || !resultName) throw new Error("Invalid inplace volumes settings");

        const filters = {
            zone: getSetting(Setting.ZONE) ?? [],
            region: getSetting(Setting.REGION) ?? [],
            facies: getSetting(Setting.FACIES) ?? [],
            license: getSetting(Setting.LICENSE) ?? [],
        };
        const address: InplaceVolumesAddress = {
            kind: DataKind.INPLACE_VOLUMES,
            ensemble,
            gridName,
            resultName,
            filters,
        };
        const indicesWithValues = INDEX_SETTINGS.flatMap((setting) => {
            const values = getSetting(setting) ?? [];
            return getSettingValueConstraints(setting)?.length
                ? [{ indexColumn: setting.toUpperCase(), values }]
                : [];
        });
        const fluidValues = getStoredData("tableDefinitions")
            ?.find((item) => item.tableName === gridName)
            ?.indicesWithValues.find((item) => item.indexColumn === "FLUID")?.values;
        if (fluidValues?.length) {
            indicesWithValues.push({ indexColumn: "FLUID", values: fluidValues });
        }
        const realizations = getSetting(Setting.REALIZATIONS);
        const response = await fetchQuery(
            postGetAggregatedPerRealizationInplaceTableDataOptions({
                query: {
                    case_uuid: ensemble.getCaseUuid(),
                    ensemble_name: ensemble.getEnsembleName(),
                    table_name: gridName,
                    result_names: [resultName],
                    group_by_indices: indicesWithValues.length
                        ? indicesWithValues.map((item) => item.indexColumn)
                        : null,
                    realizations_encoded_as_uint_list_str: realizations?.length ? encodeAsUintListStr(realizations) : null,
                    ...makeCacheBustingQueryParam(ensemble),
                },
                body: { indices_with_values: indicesWithValues },
            }),
        );
        const table = makeRealizationTable(response, address);
        const sensitivities = getWorkbenchSession().getEnsembleSet().getEnsemble(ensemble).getSensitivities();
        return deriveSensitivityColumn(table, sensitivities);
    }
}

export function makeRealizationTable(
    response: InplaceVolumesTableDataPerFluidSelection_api,
    address: InplaceVolumesAddress,
): RealizationTable {
    const realizations: number[] = [];
    const values: number[] = [];
    const indexValues = new Map<string, IndexColumnValue[]>();
    const tables = response.tableDataPerFluidSelection;
    const includeFluidSelection = tables.length > 1;

    for (const table of tables) {
        const resultColumn = table.resultColumns.find((item) => item.columnName === address.resultName) ?? table.resultColumns[0];
        if (!resultColumn) continue;
        const rowCount = resultColumn.columnValues.length;
        const selectorByName = new Map(table.selectorColumns.map((column) => [column.columnName, column]));
        const realizationColumn = selectorByName.get("REAL");
        if (!realizationColumn) throw new Error("Inplace volumes response is missing REAL selector column");

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            realizations.push(Number(realizationColumn.uniqueValues[realizationColumn.indices[rowIndex]]));
            values.push(resultColumn.columnValues[rowIndex]);
            for (const [columnName, column] of selectorByName) {
                if (columnName === "REAL") continue;
                const output = indexValues.get(columnName) ?? [];
                output.push(column.uniqueValues[column.indices[rowIndex]] ?? null);
                indexValues.set(columnName, output);
            }
            if (includeFluidSelection) {
                const output = indexValues.get("FLUID_SELECTION") ?? [];
                output.push(table.fluidSelection);
                indexValues.set("FLUID_SELECTION", output);
            }
        }
    }

    return {
        keyColumns: { realization: new Int32Array(realizations) },
        indexColumns: Object.fromEntries(indexValues),
        valueColumns: [{
            name: address.resultName,
            unit: ORDERED_VOLUME_DEFINITIONS[address.resultName]?.unit ?? "",
            values: new Float64Array(values),
        }],
        origin: { ensemble: address.ensemble, address },
    };
}
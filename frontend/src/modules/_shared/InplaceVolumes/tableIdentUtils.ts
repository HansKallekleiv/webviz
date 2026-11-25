import type { InplaceVolumesTableDefinition_api } from "@api";
import { InplaceVolumesTableSource_api } from "@api";

const SIMULATOR_TABLE_KEY_PREFIX = "simulator::";

export function encodeTableKey(tableName: string, tableSource: InplaceVolumesTableSource_api): string {
    if (tableSource === InplaceVolumesTableSource_api.SIMULATOR) {
        return `${SIMULATOR_TABLE_KEY_PREFIX}${tableName}`;
    }
    return tableName;
}

export function decodeTableKey(tableKey: string): {
    tableName: string;
    tableSource: InplaceVolumesTableSource_api;
} {
    if (tableKey.startsWith(SIMULATOR_TABLE_KEY_PREFIX)) {
        return {
            tableName: tableKey.slice(SIMULATOR_TABLE_KEY_PREFIX.length),
            tableSource: InplaceVolumesTableSource_api.SIMULATOR,
        };
    }
    return {
        tableName: tableKey,
        tableSource: InplaceVolumesTableSource_api.STATIC,
    };
}

export function formatTableDisplayName(tableKey: string): string {
    const { tableName, tableSource } = decodeTableKey(tableKey);
    if (tableSource === InplaceVolumesTableSource_api.SIMULATOR) {
        return `${tableName} (simulator)`;
    }
    return tableName;
}

export function getTableKeyFromDefinition(
    def: Pick<InplaceVolumesTableDefinition_api, "tableName" | "tableSource">,
): string {
    return encodeTableKey(def.tableName, def.tableSource);
}

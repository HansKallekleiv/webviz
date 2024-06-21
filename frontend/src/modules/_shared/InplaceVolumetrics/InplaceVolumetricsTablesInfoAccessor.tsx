import { InplaceVolumetricsTableDefinition_api } from "@api";

import { FluidZoneTypeEnum, InplaceVolumetricsInfoWithEnsembleIdent } from "./types";

export class InplaceVolumesTablesInfoAccessor {
    private _tableInfos: InplaceVolumetricsInfoWithEnsembleIdent[];

    constructor(tableInfos: InplaceVolumetricsInfoWithEnsembleIdent[]) {
        this._tableInfos = tableInfos;
    }
    private getRawResponseNamesUnion(): string[] {
        const responseNames = new Set<string>();

        for (const tableInfo of this._tableInfos) {
            for (const responseName of tableInfo.result_names) {
                responseNames.add(responseName);
            }
        }
        return Array.from(responseNames);
    }
    public getTableNames(): string[] {
        const tableNames = new Set<string>();

        for (const tableInfo of this._tableInfos) {
            tableNames.add(tableInfo.name);
        }
        return Array.from(tableNames);
    }
    public getFluidZones(): FluidZoneTypeEnum[] {
        const rawResponseNames = this.getRawResponseNamesUnion();

        const fluidZones: Set<FluidZoneTypeEnum> = new Set();
        for (const responseName of rawResponseNames) {
            if (responseName.includes("_OIL")) {
                fluidZones.add(FluidZoneTypeEnum.OIL);
            } else if (responseName.includes("_GAS")) {
                fluidZones.add(FluidZoneTypeEnum.GAS);
            } else if (responseName.includes("_WATER")) {
                fluidZones.add(FluidZoneTypeEnum.WATER);
            }
        }
        return Array.from(fluidZones);
    }

    public getResponseNames(): string[] {
        const rawResponseNames = this.getRawResponseNamesUnion();

        // Remove fluid zone suffixes
        const cleanedResponseNames = rawResponseNames.map((responseName) => {
            return responseName.replace(/_(OIL|GAS|WATER)/, "");
        });
        const combinedResponseNames = new Set(cleanedResponseNames);
        // Add total HC columns
        if (combinedResponseNames.has("STOIIP") && combinedResponseNames.has("ASSOCIATEDOIL")) {
            combinedResponseNames.add("STOIIP_TOTAL");
        }

        if (combinedResponseNames.has("GIIP") && combinedResponseNames.has("ASSOCIATEDGAS")) {
            combinedResponseNames.add("GIIP_TOTAL");
        }

        return Array.from(combinedResponseNames);
    }

    public getPropertyNames(): string[] {
        // Todo handle NET scenarios. Have to check if bulk and net values are different
        const responseNames = this.getResponseNames();
        const propertyNames: string[] = [];

        if (responseNames.includes("BULK") && responseNames.includes("NET")) {
            // todo Should only be added if bulk and net values are different
            propertyNames.push("NTG");
        }

        if (responseNames.includes("BULK") && responseNames.includes("PORV")) {
            propertyNames.push("PORO");
        }

        if (responseNames.includes("NET") && responseNames.includes("PORV")) {
            // todo Should only be added if bulk and net values are different
            propertyNames.push("PORO_NET");
        }
        if (responseNames.includes("PORV") && responseNames.includes("HCPV")) {
            propertyNames.push("SW");
        }
        //Todo
        // if (responseNames.includes("FACIES") && responseNames.includes("BULK")) {
        //     propertyNames.push("FACIES_FRACTION");
        // }
        if (responseNames.includes("HCPV") && responseNames.includes("STOIIP")) {
            propertyNames.push("BO");
        }
        if (responseNames.includes("HCPV") && responseNames.includes("GIIP")) {
            propertyNames.push("BG");
        }
        return propertyNames;
    }

    public getIndexes(): { index_name: string; values: (string | number)[] }[] {
        const indexes = new Map<string, Set<string | number>>();

        // Loop through each table, append new values if not already present
        for (const tableInfo of this._tableInfos) {
            for (const index of tableInfo.indexes) {
                if (indexes.has(index.index_name)) {
                    const existingSet = indexes.get(index.index_name);
                    if (existingSet) {
                        index.values.forEach((value) => existingSet.add(value));
                    }
                } else {
                    indexes.set(index.index_name, new Set(index.values));
                }
            }
        }
        return Array.from(indexes.entries()).map(([index_name, values]) => ({
            index_name,
            values: Array.from(values),
        }));
    }
}

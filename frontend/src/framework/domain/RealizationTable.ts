import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleParameters, ParameterIdent } from "@framework/EnsembleParameters";
import type { EnsembleSensitivities } from "@framework/EnsembleSensitivities";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { DataAddress } from "./DataAddress";

export type IndexColumnValue = string | number | null;
export type Column = Float64Array | Int32Array | readonly IndexColumnValue[];

export type ValueColumn = {
    name: string;
    unit: string;
    values: Float64Array;
};

export type RealizationTable = {
    keyColumns: {
        realization: Int32Array;
        timestamp?: Float64Array;
    };
    indexColumns: Readonly<Record<string, Column>>;
    valueColumns: readonly ValueColumn[];
    origin: {
        ensemble: RegularEnsembleIdent | DeltaEnsembleIdent;
        address: DataAddress;
    };
};

export const SENSITIVITY_NAME_COLUMN = "SENSITIVITY_NAME";
export const SENSITIVITY_CASE_COLUMN = "SENSITIVITY_CASE";

export function makeParameterColumnName(parameterIdent: ParameterIdent): string {
    return `PARAMETER:${parameterIdent.toString()}`;
}

export function getColumnValue(column: Column, rowIndex: number): IndexColumnValue {
    return column[rowIndex] ?? null;
}

export function deriveSensitivityColumn(
    table: RealizationTable,
    sensitivities: EnsembleSensitivities | null,
): RealizationTable {
    if (!sensitivities || sensitivities.getSensitivityArr().length === 0) {
        return table;
    }

    const sensitivityByRealization = new Map<number, { name: string; caseName: string }>();
    for (const sensitivity of sensitivities.getSensitivityArr()) {
        for (const sensitivityCase of sensitivity.cases) {
            for (const realization of sensitivityCase.realizations) {
                const existing = sensitivityByRealization.get(realization);
                if (existing && (existing.name !== sensitivity.name || existing.caseName !== sensitivityCase.name)) {
                    throw new Error(`Realization ${realization} belongs to multiple sensitivity cases`);
                }
                sensitivityByRealization.set(realization, { name: sensitivity.name, caseName: sensitivityCase.name });
            }
        }
    }

    const sensitivityNames: IndexColumnValue[] = [];
    const sensitivityCases: IndexColumnValue[] = [];
    for (const realization of table.keyColumns.realization) {
        const sensitivity = sensitivityByRealization.get(realization);
        sensitivityNames.push(sensitivity?.name ?? null);
        sensitivityCases.push(sensitivity?.caseName ?? null);
    }

    return {
        ...table,
        indexColumns: {
            ...table.indexColumns,
            [SENSITIVITY_NAME_COLUMN]: sensitivityNames,
            [SENSITIVITY_CASE_COLUMN]: sensitivityCases,
        },
    };
}

export function deriveParameterColumn(
    table: RealizationTable,
    parameters: EnsembleParameters,
    parameterIdent: ParameterIdent,
): RealizationTable {
    const parameter = parameters.findParameter(parameterIdent);
    if (!parameter) {
        return table;
    }

    const valueByRealization = new Map<number, string | number>();
    parameter.realizations.forEach((realization, index) => {
        valueByRealization.set(realization, parameter.values[index]);
    });

    const values = Array.from(table.keyColumns.realization, (realization) => valueByRealization.get(realization) ?? null);
    const hasMissingValues = values.some((value) => value === null);
    const hasOnlyNumericValues = values.every((value) => typeof value === "number");
    const column = hasOnlyNumericValues && !hasMissingValues ? new Float64Array(values as number[]) : values;

    return {
        ...table,
        indexColumns: {
            ...table.indexColumns,
            [makeParameterColumnName(parameterIdent)]: column,
        },
    };
}
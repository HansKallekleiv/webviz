import { http, HttpResponse } from "msw";
import type { PathParams, StrictResponse } from "msw";

import type {
    BodyPostGetAggregatedPerRealizationInplaceTableData_api,
    BodyPostGetAggregatedStatisticalInplaceTableData_api,
    InplaceVolumesIndexWithValues_api,
    InplaceVolumesStatisticalTableDataPerFluidSelection_api,
    InplaceVolumesStatisticalTableData_api,
    InplaceVolumesTableDataPerFluidSelection_api,
    InplaceVolumesTableData_api,
    InplaceVolumesTableDefinition_api,
    RepeatedTableColumnData_api,
} from "@api";

import { apiUrl } from "../apiUrl";
import {
    SYNTH,
    SYNTH_INPLACE,
    SynthInplaceRequestError,
    computeSynthInplacePerRealizationRows,
    computeSynthInplaceStatisticalRows,
    getSynthInplaceGroupColumns,
    isSynthEnsemble,
} from "../syntheticField";
import type { SynthInplaceStatistic } from "../syntheticField";

import { decodeUintListStr, errorResponse } from "./_common";

type InplaceDataBody =
    | BodyPostGetAggregatedStatisticalInplaceTableData_api
    | BodyPostGetAggregatedPerRealizationInplaceTableData_api;

type InplaceDataQuery = {
    resultNames: string[];
    groupBy: string[];
    realizations: number[];
    filters: InplaceVolumesIndexWithValues_api[];
};

const STATISTICS: readonly SynthInplaceStatistic[] = ["mean", "stddev", "max", "min", "p10", "p90"];

/** Backend's RepeatedTableColumnData: unique values in first-seen order, plus one index per row. */
function makeRepeatedColumn(columnName: string, values: (string | number)[]): RepeatedTableColumnData_api {
    const uniqueValues = [...new Set(values)];
    return { columnName, uniqueValues, indices: values.map((value) => uniqueValues.indexOf(value)) };
}

function groupByFluidSelection<T extends { fluidSelection: string }>(rows: T[]): Map<string, T[]> {
    const rowsPerFluid = new Map<string, T[]>();
    for (const row of rows) {
        rowsPerFluid.set(row.fluidSelection, [...(rowsPerFluid.get(row.fluidSelection) ?? []), row]);
    }
    return rowsPerFluid;
}

async function parseDataRequest(request: Request): Promise<InplaceDataQuery | StrictResponse<never>> {
    const searchParams = new URL(request.url).searchParams;
    if (!isSynthEnsemble(searchParams.get("case_uuid"), searchParams.get("ensemble_name"))) {
        return errorResponse(404, "Ensemble not found");
    }
    if (searchParams.get("table_name") !== SYNTH_INPLACE.tableName) {
        return errorResponse(404, "Inplace volumes table not found");
    }

    const resultNames = searchParams.getAll("result_names");
    if (resultNames.length === 0) {
        return errorResponse(400, "result_names is required");
    }

    const encodedRealizations = searchParams.get("realizations_encoded_as_uint_list_str");
    const realizations = encodedRealizations ? decodeUintListStr(encodedRealizations) : [...SYNTH.realizations];
    if (!realizations.every((real) => (SYNTH.realizations as readonly number[]).includes(real))) {
        return errorResponse(404, "Missing realizations in the inplace volumes table");
    }

    const body = (await request.json()) as Partial<InplaceDataBody> | null;
    if (!Array.isArray(body?.indices_with_values)) {
        return errorResponse(400, "Body must contain indices_with_values");
    }

    return {
        resultNames,
        groupBy: searchParams.getAll("group_by_indices"),
        realizations,
        filters: body.indices_with_values,
    };
}

function makePerRealizationResponse(query: InplaceDataQuery): InplaceVolumesTableDataPerFluidSelection_api {
    const groupColumns = getSynthInplaceGroupColumns(query.groupBy);
    const resultNames = [...new Set(query.resultNames)];
    const rowsPerFluid = groupByFluidSelection(computeSynthInplacePerRealizationRows(query));

    const tables: InplaceVolumesTableData_api[] = [...rowsPerFluid].map(([fluidSelection, rows]) => ({
        fluidSelection,
        selectorColumns: [
            ...groupColumns.map((column, i) =>
                makeRepeatedColumn(
                    column,
                    rows.map((row) => row.groupValues[i]),
                ),
            ),
            makeRepeatedColumn(
                "REAL",
                rows.map((row) => row.realization),
            ),
        ],
        resultColumns: resultNames.map((name) => ({
            columnName: name,
            columnValues: rows.map((row) => row.values[name]),
        })),
    }));
    return { tableDataPerFluidSelection: tables };
}

function makeStatisticalResponse(query: InplaceDataQuery): InplaceVolumesStatisticalTableDataPerFluidSelection_api {
    const groupColumns = getSynthInplaceGroupColumns(query.groupBy);
    const resultNames = [...new Set(query.resultNames)];
    // Same query per result name, so the row order is identical across result names
    const rowsPerResult = resultNames.map((resultName) => computeSynthInplaceStatisticalRows({ ...query, resultName }));
    const rowsPerFluid = groupByFluidSelection(rowsPerResult[0].map((row, rowIndex) => ({ ...row, rowIndex })));

    const tables: InplaceVolumesStatisticalTableData_api[] = [...rowsPerFluid].map(([fluidSelection, rows]) => ({
        fluidSelection,
        selectorColumns: groupColumns.map((column, i) =>
            makeRepeatedColumn(
                column,
                rows.map((row) => row.groupValues[i]),
            ),
        ),
        resultColumnStatistics: resultNames.map((columnName, resultIndex) => ({
            columnName,
            statisticValues: Object.fromEntries(
                STATISTICS.map((statistic) => [
                    statistic,
                    rows.map((row) => rowsPerResult[resultIndex][row.rowIndex].statistics[statistic]),
                ]),
            ),
        })),
    }));
    return { tableDataPerFluidSelection: tables };
}

function withRequestErrors<T>(makeResponse: () => T): T | StrictResponse<never> {
    try {
        return makeResponse();
    } catch (error) {
        if (error instanceof SynthInplaceRequestError) {
            return errorResponse(400, error.message);
        }
        throw error;
    }
}

export const inplaceVolumesHandlers = [
    http.get<PathParams, never, InplaceVolumesTableDefinition_api[]>(
        apiUrl("/inplace_volumes/inplace_table_definitions/"),
        ({ request }) => {
            const searchParams = new URL(request.url).searchParams;
            if (!isSynthEnsemble(searchParams.get("case_uuid"), searchParams.get("ensemble_name"))) {
                return errorResponse(404, "Ensemble not found");
            }
            return HttpResponse.json([
                {
                    tableName: SYNTH_INPLACE.tableName,
                    resultNames: [...SYNTH_INPLACE.resultNames],
                    indicesWithValues: SYNTH_INPLACE.indices.map((index) => ({
                        indexColumn: index.indexColumn,
                        values: [...index.values],
                    })),
                },
            ]);
        },
    ),

    http.post<
        PathParams,
        BodyPostGetAggregatedPerRealizationInplaceTableData_api,
        InplaceVolumesTableDataPerFluidSelection_api
    >(apiUrl("/inplace_volumes/get_aggregated_per_realization_inplace_table_data/"), async ({ request }) => {
        const query = await parseDataRequest(request);
        if (query instanceof Response) return query;
        const response = withRequestErrors(() => makePerRealizationResponse(query));
        return response instanceof Response ? response : HttpResponse.json(response);
    }),

    http.post<
        PathParams,
        BodyPostGetAggregatedStatisticalInplaceTableData_api,
        InplaceVolumesStatisticalTableDataPerFluidSelection_api
    >(apiUrl("/inplace_volumes/get_aggregated_statistical_inplace_table_data/"), async ({ request }) => {
        const query = await parseDataRequest(request);
        if (query instanceof Response) return query;
        const response = withRequestErrors(() => makeStatisticalResponse(query));
        return response instanceof Response ? response : HttpResponse.json(response);
    }),
];

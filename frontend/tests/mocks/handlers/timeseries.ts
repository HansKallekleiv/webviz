import { http, HttpResponse } from "msw";
import type { PathParams } from "msw";

import type {
    StatisticFunction_api,
    SummaryVectorObservations_api,
    VectorDescription_api,
    VectorStatisticData_api,
} from "@api";

import { apiUrl } from "../apiUrl";
import {
    ALL_SYNTH_STATISTICS,
    SYNTH,
    SYNTH_TIMESTAMPS_UTC_MS,
    SYNTH_VECTORS,
    computeSynthStatistics,
    findSynthVector,
    isSynthEnsemble,
} from "../syntheticField";
import type { SynthStatisticName } from "../syntheticField";

import { decodeUintListStr, errorResponse } from "./_common";

function isSynthStatisticName(value: string): value is SynthStatisticName {
    return (ALL_SYNTH_STATISTICS as readonly string[]).includes(value);
}

export const timeseriesHandlers = [
    // No vector has a historical counterpart (`hasHistorical: false`), so the historical endpoint is not mocked.
    http.get<PathParams, never, VectorDescription_api[]>(apiUrl("/timeseries/vector_list/"), ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if (!isSynthEnsemble(searchParams.get("case_uuid"), searchParams.get("ensemble_name"))) {
            return errorResponse(404, "Ensemble not found");
        }

        return HttpResponse.json(
            SYNTH_VECTORS.map((vector) => ({
                name: vector.name,
                descriptiveName: vector.descriptiveName,
                hasHistorical: false,
            })),
        );
    }),

    // Resampling frequency is ignored: the synthetic data is monthly only.
    http.get<PathParams, never, VectorStatisticData_api>(
        apiUrl("/timeseries/statistical_vector_data/"),
        ({ request }) => {
            const searchParams = new URL(request.url).searchParams;
            if (!isSynthEnsemble(searchParams.get("case_uuid"), searchParams.get("ensemble_name"))) {
                return errorResponse(404, "Ensemble not found");
            }
            const vector = findSynthVector(searchParams.get("vector_name") ?? "");
            if (!vector) {
                return errorResponse(404, "Vector not found");
            }

            const requestedStatistics = searchParams.getAll("statistic_functions").filter(isSynthStatisticName);
            const statistics = requestedStatistics.length > 0 ? requestedStatistics : ALL_SYNTH_STATISTICS;

            const encodedRealizations = searchParams.get("realizations_encoded_as_uint_list_str");
            const realizations = encodedRealizations
                ? decodeUintListStr(encodedRealizations).filter((real) =>
                      (SYNTH.realizations as readonly number[]).includes(real),
                  )
                : [...SYNTH.realizations];
            if (realizations.length === 0) {
                return errorResponse(404, "Could not compute statistics");
            }

            const valuesPerStatistic = computeSynthStatistics(vector.name, realizations, statistics);

            return HttpResponse.json({
                realizations,
                timestampsUtcMs: [...SYNTH_TIMESTAMPS_UTC_MS],
                valueObjects: statistics.map((statistic) => ({
                    statisticFunction: statistic as StatisticFunction_api,
                    values: valuesPerStatistic[statistic],
                })),
                unit: vector.unit,
                isRate: vector.isRate,
            });
        },
    ),

    // The synthetic ensemble has no observations.
    http.get<PathParams, never, SummaryVectorObservations_api[]>(apiUrl("/observations/summary_observations"), () =>
        HttpResponse.json([]),
    ),
];

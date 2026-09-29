import { http, HttpResponse } from "msw";
import type { PathParams } from "msw";

import type { EnsembleParametersAndSensitivities_api } from "@api";

import { apiUrl } from "../apiUrl";
import { SYNTH, SYNTH_PARAMETERS, getSynthParameterValues, isSynthEnsemble } from "../syntheticField";

import { errorResponse } from "./_common";

export const parametersHandlers = [
    http.get<PathParams, never, EnsembleParametersAndSensitivities_api>(
        apiUrl("/parameters/parameters_and_sensitivities/"),
        ({ request }) => {
            const searchParams = new URL(request.url).searchParams;
            if (!isSynthEnsemble(searchParams.get("case_uuid"), searchParams.get("ensemble_name"))) {
                return errorResponse(404, "Ensemble not found");
            }

            return HttpResponse.json({
                parameters: SYNTH_PARAMETERS.map((definition) => ({
                    name: definition.name,
                    isLogarithmic: false,
                    isDiscrete: false,
                    isConstant: false,
                    isNumerical: true,
                    groupName: definition.groupName,
                    descriptiveName: null,
                    realizations: [...SYNTH.realizations],
                    values: getSynthParameterValues(definition),
                })),
                sensitivities: [],
            });
        },
    ),
];

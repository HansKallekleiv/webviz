import { http, HttpResponse } from "msw";
import type { PathParams } from "msw";

import type {
    AssetInfo_api,
    CaseInfo_api,
    EnsembleDetails_api,
    EnsembleIdent_api,
    PostRefreshFingerprintsForEnsemblesResponse_api,
} from "@api";

import { apiUrl } from "../apiUrl";
import { SYNTH, isSynthEnsemble } from "../syntheticField";

import { errorResponse } from "./_common";

const SYNTH_FINGERPRINT = "synthetic-fingerprint-v1";

export const exploreHandlers = [
    http.get<PathParams, never, AssetInfo_api[]>(apiUrl("/asset_infos"), () =>
        HttpResponse.json([{ name: SYNTH.assetName }]),
    ),

    http.get<PathParams, never, CaseInfo_api[]>(apiUrl("/cases"), ({ request }) => {
        const assetName = new URL(request.url).searchParams.get("asset_name");
        if (assetName !== SYNTH.assetName) {
            return HttpResponse.json([]);
        }

        return HttpResponse.json([
            {
                uuid: SYNTH.caseUuid,
                name: SYNTH.caseName,
                status: "keep",
                user: SYNTH.userName,
                updatedAtUtcMs: SYNTH.updatedAtUtcMs,
                description: "Deterministic synthetic case for offline tests",
                modelName: "SynthModel",
                modelRevision: "1.0.0",
                ensembles: [
                    { name: SYNTH.ensembleName, realizationCount: SYNTH.realizations.length, standardResults: [] },
                ],
            },
        ]);
    }),

    http.get<PathParams, never, EnsembleDetails_api>(
        apiUrl("/cases/{case_uuid}/ensembles/{ensemble_name}"),
        ({ params }) => {
            if (!isSynthEnsemble(String(params.case_uuid), String(params.ensemble_name))) {
                return errorResponse(404, "Ensemble not found");
            }

            return HttpResponse.json({
                name: SYNTH.ensembleName,
                assetName: SYNTH.assetName,
                fieldIdentifiers: [SYNTH.fieldIdentifier],
                caseName: SYNTH.caseName,
                caseUuid: SYNTH.caseUuid,
                realizations: [...SYNTH.realizations],
                stratigraphicColumnIdentifier: "SYNTH_STRAT",
                standardResults: [],
                fipRegions: [],
            });
        },
    ),

    http.post<PathParams, EnsembleIdent_api[], PostRefreshFingerprintsForEnsemblesResponse_api>(
        apiUrl("/ensembles/refresh_fingerprints"),
        async ({ request }) => {
            const idents = await request.json();
            return HttpResponse.json(
                idents.map((ident) => (isSynthEnsemble(ident.caseUuid, ident.ensembleName) ? SYNTH_FINGERPRINT : null)),
            );
        },
    ),
];

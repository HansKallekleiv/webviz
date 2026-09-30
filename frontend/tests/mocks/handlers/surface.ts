import { readFileSync } from "node:fs";

import { http, HttpResponse } from "msw";
import type { PathParams } from "msw";

import type { SurfaceDataFloat_api, SurfaceMetaSet_api } from "@api";

import { apiUrl } from "../apiUrl";
import manifestJson from "../fixtures/surfaces/manifest.json" with { type: "json" };
import { SYNTH_SURFACE_METADATA, isSynthEnsemble } from "../syntheticField";

import { errorResponse } from "./_common";

export type SurfaceFixtureManifest = {
    caseUuid: string;
    ensembleName: string;
    surfaces: { name: string; attribute: string; realization: number; file: string }[];
};

export const SURFACE_FIXTURE_MANIFEST: SurfaceFixtureManifest = manifestJson;

const fixtureCache = new Map<string, SurfaceDataFloat_api>();

export function loadSurfaceFixture(file: string): SurfaceDataFloat_api {
    let data = fixtureCache.get(file);
    if (!data) {
        const url = new URL(`../fixtures/surfaces/${file}`, import.meta.url);
        data = JSON.parse(readFileSync(url, "utf-8")) as SurfaceDataFloat_api;
        fixtureCache.set(file, data);
    }
    return data;
}

// REAL~~<case>~~<ensemble>~~<name>~~TAGNAME~~<attribute>~~~~<realization>, see src/modules/_shared/Surface/surfaceAddress.ts
function findRealizationSurfaceFile(surfAddrStr: string): string | null {
    const [addrType, caseUuid, ensemble, name, attrKind, attribute, , realization, ...rest] = surfAddrStr.split("~~");
    if (addrType !== "REAL" || attrKind !== "TAGNAME" || rest.length > 0) return null;
    if (caseUuid !== SURFACE_FIXTURE_MANIFEST.caseUuid || ensemble !== SURFACE_FIXTURE_MANIFEST.ensembleName) {
        return null;
    }

    const entry = SURFACE_FIXTURE_MANIFEST.surfaces.find(
        (surface) =>
            surface.name === name && surface.attribute === attribute && String(surface.realization) === realization,
    );
    return entry?.file ?? null;
}

export const surfaceHandlers = [
    http.get<PathParams, never, SurfaceMetaSet_api>(
        apiUrl("/surface/realization_surfaces_metadata/"),
        ({ request }) => {
            const searchParams = new URL(request.url).searchParams;
            if (!isSynthEnsemble(searchParams.get("case_uuid"), searchParams.get("ensemble_name"))) {
                return errorResponse(404, "Ensemble not found");
            }
            return HttpResponse.json(SYNTH_SURFACE_METADATA);
        },
    ),

    http.get<PathParams, never, SurfaceDataFloat_api>(apiUrl("/surface/surface_data"), ({ request }) => {
        const searchParams = new URL(request.url).searchParams;
        if ((searchParams.get("data_format") ?? "float") !== "float" || searchParams.get("resample_to_def_str")) {
            return errorResponse(400, "Only float data without resampling is mocked");
        }

        const file = findRealizationSurfaceFile(searchParams.get("surf_addr_str") ?? "");
        if (!file) {
            return errorResponse(404, "Surface not found");
        }
        return HttpResponse.json(loadSurfaceFixture(file));
    }),
];

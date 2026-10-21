import type { GetDeltaSurfaceDataData_api, SurfaceMeta_api, SurfaceMetaSet_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import type { RealizationSurfaceAddress } from "./surfaceAddress";
import { encodeSurfAddrStr } from "./surfaceAddress";
import { isSameAttribute } from "./surfaceAttribute";

function isSameSurfaceMeta(a: SurfaceMeta_api, b: SurfaceMeta_api): boolean {
    return a.name === b.name && a.time_type === b.time_type && isSameAttribute(a.attribute, b.attribute);
}

/** Surfaces, time points and intervals present in both sets; strat order taken from `a`. */
export function intersectSurfaceMetaSets(a: SurfaceMetaSet_api, b: SurfaceMetaSet_api): SurfaceMetaSet_api {
    const timePointsInB = new Set(b.time_points_iso_str);
    const timeIntervalsInB = new Set(b.time_intervals_iso_str);

    return {
        surfaces: a.surfaces.filter((surfaceA) => b.surfaces.some((surfaceB) => isSameSurfaceMeta(surfaceA, surfaceB))),
        time_points_iso_str: a.time_points_iso_str.filter((timePoint) => timePointsInB.has(timePoint)),
        time_intervals_iso_str: a.time_intervals_iso_str.filter((interval) => timeIntervalsInB.has(interval)),
        surface_names_in_strat_order: a.surface_names_in_strat_order,
    };
}

/** Query for /surface/delta_surface_data: REAL address on the comparison ensemble, reference as separate params. */
export function makeDeltaSurfaceDataQuery(
    realizationAddress: RealizationSurfaceAddress,
    deltaEnsembleIdent: DeltaEnsembleIdent,
    dataFormat: "float" | "png",
): GetDeltaSurfaceDataData_api["query"] {
    const comparisonIdent = deltaEnsembleIdent.getComparisonEnsembleIdent();
    const referenceIdent = deltaEnsembleIdent.getReferenceEnsembleIdent();

    if (
        realizationAddress.caseUuid !== comparisonIdent.getCaseUuid() ||
        realizationAddress.ensemble !== comparisonIdent.getEnsembleName()
    ) {
        throw new Error("Surface address must be built with the comparison ensemble of the delta ensemble");
    }

    return {
        surf_addr_str: encodeSurfAddrStr(realizationAddress),
        reference_case_uuid: referenceIdent.getCaseUuid(),
        reference_ensemble_name: referenceIdent.getEnsembleName(),
        data_format: dataFormat,
        resample_to_def_str: null,
        ...makeCacheBustingQueryParam(comparisonIdent, referenceIdent),
    };
}

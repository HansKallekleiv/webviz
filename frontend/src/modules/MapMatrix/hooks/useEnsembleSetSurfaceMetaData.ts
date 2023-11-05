import React from "react";

import { SurfaceMeta_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { isEqual } from "lodash";

import { EnsembleSetSurfaceMetas } from "./useEnsembleSetSurfaceMetaQuery";

export function useEnsembleSetSurfaceMetaData(ensembleSetSurfaceMetas: EnsembleSetSurfaceMetas) {
    const [prevEnsembleSetSurfaceMetas, setPrevEnsembleSetSurfaceMetas] =
        React.useState<EnsembleSetSurfaceMetas | null>(null);

    let ensembleSetSurfaceMetaData: Array<{
        ensembleIdent: EnsembleIdent;
        surfaceMetas?: SurfaceMeta_api[];
    }> = [];
    if (!ensembleSetSurfaceMetas.isFetching && !isEqual(prevEnsembleSetSurfaceMetas, ensembleSetSurfaceMetas)) {
        setPrevEnsembleSetSurfaceMetas(ensembleSetSurfaceMetas);
        ensembleSetSurfaceMetaData = ensembleSetSurfaceMetas.data;
    } else if (prevEnsembleSetSurfaceMetas) {
        ensembleSetSurfaceMetaData = prevEnsembleSetSurfaceMetas.data;
    }
    const getEnsembleSurfaceMeta = (ensembleIdent: EnsembleIdent | null): SurfaceMeta_api[] => {
        const ensembleSurfaceMeta = ensembleSetSurfaceMetaData.filter(
            (ensembleSurfaceSet) => ensembleSurfaceSet.ensembleIdent === ensembleIdent
        )[0];
        if (ensembleSurfaceMeta && ensembleSurfaceMeta.surfaceMetas) {
            return ensembleSurfaceMeta.surfaceMetas;
        }
        return [];
    };
    return { getEnsembleSurfaceMeta };
}

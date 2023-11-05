import React from "react";

import { SurfaceAttributeType_api, SurfaceMeta_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { isIsoStringInterval } from "@framework/utils/timestampUtils";

import { isEqual } from "lodash";

import { EnsembleSetSurfaceMetas } from "./useEnsembleSetSurfaceMetas";

export enum TimeType {
    None = "None",
    TimePoint = "TimePoint",
    Interval = "Interval",
}

export type EnsembleSetSurfaceDirectoryOptions = {
    ensembleSetSurfaceMetas: EnsembleSetSurfaceMetas;
    timeType: TimeType;
    includeAttributeTypes?: SurfaceAttributeType_api[];
    excludeAttributeTypes?: SurfaceAttributeType_api[];
    useObservedSurfaces?: boolean;
};
export function useEnsembleSetSurfaceDirectory(options: EnsembleSetSurfaceDirectoryOptions) {
    const [prevEnsembleSetSurfaceMetas, setPrevEnsembleSetSurfaceMetas] =
        React.useState<EnsembleSetSurfaceMetas | null>(null);

    let surfaceMetas: SurfaceMeta_api[] = [];
    if (
        !options.ensembleSetSurfaceMetas.isFetching &&
        !isEqual(prevEnsembleSetSurfaceMetas, options.ensembleSetSurfaceMetas)
    ) {
        setPrevEnsembleSetSurfaceMetas(options.ensembleSetSurfaceMetas);
        surfaceMetas = getSurfaceMetasIntersection(options.ensembleSetSurfaceMetas.data);
    } else if (prevEnsembleSetSurfaceMetas) {
        surfaceMetas = getSurfaceMetasIntersection(prevEnsembleSetSurfaceMetas.data);
    }

    surfaceMetas = filterOnTimeType(surfaceMetas, options.timeType);
    surfaceMetas = filterOnAttributeType(
        surfaceMetas,
        options.includeAttributeTypes ?? null,
        options.excludeAttributeTypes ?? null
    );
    surfaceMetas = filterOnObservedStatus(surfaceMetas, options.useObservedSurfaces ?? false);

    const getEnsembleIdents = React.useCallback(() => {
        return options.ensembleSetSurfaceMetas.data.map((ensembleSurfaceMeta) => ensembleSurfaceMeta.ensembleIdent);
    }, [options]);
    const getAttributeNames = React.useCallback(
        (requireSurfaceName: string | null) => {
            let filteredList = surfaceMetas;
            if (requireSurfaceName) {
                filteredList = filterOnName(filteredList, requireSurfaceName);
            }
            return [...new Set(filteredList.map((surface) => surface.attribute_name))].sort();
        },
        [options]
    );
    const getSurfaceNames = React.useCallback(
        (requireAttributeName: string | null) => {
            let filteredList = surfaceMetas;
            if (requireAttributeName) {
                filteredList = filterOnAttribute(filteredList, requireAttributeName);
            }
            return [...new Set(filteredList.map((surface) => surface.name))];
        },
        [options]
    );
    const getTimeOrIntervalStrings = React.useCallback(
        (requireSurfaceName: string | null, requireAttributeName: string | null) => {
            let filteredList = surfaceMetas;

            if (requireSurfaceName || requireAttributeName) {
                filteredList = filteredList.filter((surface) => {
                    const matchedOnSurfName = !requireSurfaceName || surface.name === requireSurfaceName;
                    const matchedOnAttrName = !requireAttributeName || surface.attribute_name === requireAttributeName;
                    return matchedOnSurfName && matchedOnAttrName;
                });
            }
            if (filteredList.length === 0) {
                return [];
            }

            const timeOrIntervalsSet: Set<string> = new Set();
            filteredList.forEach((surface) => {
                if (surface.iso_date_or_interval) {
                    timeOrIntervalsSet.add(surface.iso_date_or_interval);
                }
            });
            return [...timeOrIntervalsSet].sort();
        },
        [options]
    );

    return {
        getAttributeNames,
        getSurfaceNames,
        getTimeOrIntervalStrings,
        getEnsembleIdents,
    };
}

function getSurfaceMetasIntersection(
    ensembleSurfaceMetas: Array<{ ensembleIdent: EnsembleIdent; surfaceMetas?: SurfaceMeta_api[] }>
): SurfaceMeta_api[] {
    if (ensembleSurfaceMetas.length === 0) {
        return [];
    }

    // Start with the first array of surfaceMetas as the initial intersection
    let surfaceMetasIntersection = ensembleSurfaceMetas[0].surfaceMetas ?? [];

    // Iterate starting from the second item, since we used the first to initialize
    for (let i = 1; i < ensembleSurfaceMetas.length; i++) {
        const surfaceMetas = ensembleSurfaceMetas[i].surfaceMetas ?? [];
        surfaceMetasIntersection = surfaceMetasIntersection.filter((meta) =>
            surfaceMetas.some(
                (innerMeta) =>
                    innerMeta.name === meta.name &&
                    innerMeta.attribute_name === meta.attribute_name &&
                    innerMeta.attribute_type === meta.attribute_type &&
                    innerMeta.iso_date_or_interval === meta.iso_date_or_interval &&
                    innerMeta.is_observation === meta.is_observation
            )
        );
    }

    return surfaceMetasIntersection;
}

// Filters directory based on time type.
function filterOnTimeType(surfaceList: SurfaceMeta_api[], timeType: TimeType): SurfaceMeta_api[] {
    switch (timeType) {
        case TimeType.None:
            return surfaceList.filter((surface) => !surface.iso_date_or_interval);
        case TimeType.TimePoint:
            return surfaceList.filter(
                (surface) => surface.iso_date_or_interval && !isIsoStringInterval(surface.iso_date_or_interval)
            );
        case TimeType.Interval:
            return surfaceList.filter(
                (surface) => surface.iso_date_or_interval && isIsoStringInterval(surface.iso_date_or_interval)
            );
        default:
            throw new Error("Invalid TimeType");
    }
}

function filterOnAttributeType(
    surfaceList: SurfaceMeta_api[],
    includeAttributeTypes: SurfaceAttributeType_api[] | null,
    excludeAttributeTypes: SurfaceAttributeType_api[] | null
): SurfaceMeta_api[] {
    if (includeAttributeTypes && includeAttributeTypes.length > 0) {
        surfaceList = surfaceList.filter((surface) => includeAttributeTypes.includes(surface.attribute_type));
    }
    if (excludeAttributeTypes && excludeAttributeTypes.length) {
        surfaceList = surfaceList.filter((surface) => !excludeAttributeTypes.includes(surface.attribute_type));
    }
    return surfaceList;
}

function filterOnObservedStatus(surfaceList: SurfaceMeta_api[], useObservedSurfaces: boolean): SurfaceMeta_api[] {
    if (useObservedSurfaces) {
        return surfaceList.filter((surface) => surface.is_observation);
    }
    return surfaceList.filter((surface) => !surface.is_observation);
}

// Filters directory based on a specific surface attribute.
function filterOnAttribute(surfaceList: SurfaceMeta_api[], surfaceAttribute: string): SurfaceMeta_api[] {
    return surfaceList.filter((surface) => surface.attribute_name === surfaceAttribute);
}

// Filters directory based on a specific surface name.
function filterOnName(surfaceList: SurfaceMeta_api[], surfaceName: string): SurfaceMeta_api[] {
    return surfaceList.filter((surface) => surface.name === surfaceName);
}

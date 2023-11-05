import React from "react";

import { SurfaceAttributeType_api, SurfaceMeta_api } from "@api";
import { Ensemble } from "@framework/Ensemble";
import { isIsoStringInterval } from "@framework/utils/timestampUtils";

export enum TimeType {
    None = "None",
    TimePoint = "TimePoint",
    Interval = "Interval",
}

export type EnsembleSurfaceDirectoryOptions = {
    surfaceMetas: SurfaceMeta_api[];
    timeType: TimeType;
    includeAttributeTypes?: SurfaceAttributeType_api[];
    excludeAttributeTypes?: SurfaceAttributeType_api[];
    useObservedSurfaces?: boolean;
};
export function useEnsembleSurfaceDirectory(options: EnsembleSurfaceDirectoryOptions) {
    let surfaceMetas: SurfaceMeta_api[] = options.surfaceMetas;

    surfaceMetas = filterOnTimeType(surfaceMetas, options.timeType);
    surfaceMetas = filterOnAttributeType(
        surfaceMetas,
        options.includeAttributeTypes ?? null,
        options.excludeAttributeTypes ?? null
    );
    surfaceMetas = filterOnObservedStatus(surfaceMetas, options.useObservedSurfaces ?? false);

    const getAttributeNames = (requireSurfaceName: string | null) => {
        let filteredList = surfaceMetas;
        if (requireSurfaceName) {
            filteredList = filterOnName(filteredList, requireSurfaceName);
        }
        return [...new Set(filteredList.map((surface) => surface.attribute_name))].sort();
    };
    const getSurfaceNames = (requireAttributeName: string | null) => {
        let filteredList = surfaceMetas;
        if (requireAttributeName) {
            filteredList = filterOnAttribute(filteredList, requireAttributeName);
        }
        return [...new Set(filteredList.map((surface) => surface.name))];
    };
    const getTimeOrIntervalStrings = (requireSurfaceName: string | null, requireAttributeName: string | null) => {
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
    };

    return {
        getAttributeNames,
        getSurfaceNames,
        getTimeOrIntervalStrings,
    };
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

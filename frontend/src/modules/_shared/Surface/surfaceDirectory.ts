import { SurfaceAttributeType_api, SurfaceMeta_api } from "@api";
import { IsisoStringInterval } from "@framework/utils/timestampUtils";

export enum TimeType {
    None = "None",
    Timestamp = "Timestamp",
    Interval = "Interval",
}
export type SurfaceDirectoryOptions = {
    surfaceMetas: SurfaceMeta_api[];
    timeType: TimeType;
    includeAttributeTypes?: SurfaceAttributeType_api[] | null;
    excludeAttributeTypes?: SurfaceAttributeType_api[] | null;
    useObservedSurfaces?: boolean | null;
};
// Class responsible for managing a directory of surfaces.
export class SurfaceDirectory {
    private _surfaceList: SurfaceMeta_api[] = [];

    // Constructs a SurfaceDirectory with optional content filter criteria.
    constructor(options: SurfaceDirectoryOptions | null) {
        if (!options) return;

        const { surfaceMetas, timeType, includeAttributeTypes, excludeAttributeTypes, useObservedSurfaces } = options;

        let filteredList = filterOnTimeType(surfaceMetas, timeType);

        if (includeAttributeTypes && includeAttributeTypes.length) {
            filteredList = filteredList.filter((surface) =>
                includeAttributeTypes.includes(surface.attribute_type as SurfaceAttributeType_api)
            );
        }
        if (excludeAttributeTypes && excludeAttributeTypes.length) {
            filteredList = filteredList.filter(
                (surface) => !excludeAttributeTypes.includes(surface.attribute_type as SurfaceAttributeType_api)
            );
        }
        useObservedSurfaces
            ? (filteredList = filteredList.filter((surface) => surface.is_observation))
            : (filteredList = filteredList.filter((surface) => !surface.is_observation));

        this._surfaceList = filteredList;
    }

    // Retrieves unique attributes for a given time type and optional surface name.
    public getAttributeNames(stratigraphicName: string | null): string[] {
        const filteredList = filterOnName(this._surfaceList, stratigraphicName);
        return [...new Set(filteredList.map((surface) => surface.attribute_name))].sort();
    }

    // Retrieves unique names for a given time type and optional surface attribute.
    public getStratigraphicNames(attributeName: string | null): string[] {
        const filteredList = filterOnAttribute(this._surfaceList, attributeName);
        return [...new Set(filteredList.map((surface) => surface.stratigraphic_name))];
    }

    // Retrieves unique timestamps for a given surface name and attribute.
    public getTimeStampsOrIntervals(stratigraphicName: string | null, surfaceAttribute: string | null): string[] {
        if (!surfaceAttribute || !stratigraphicName) return [];

        const filteredList = this._surfaceList.filter(
            (surface) => surface.attribute_name === surfaceAttribute && surface.stratigraphic_name === stratigraphicName
        );
        if (filteredList.length === 0) return [];
        const timeStamps: string[] = [];
        filteredList.forEach((surface) => {
            if (surface.iso_date_or_interval) timeStamps.push(surface.iso_date_or_interval);
        });
        return [...new Set(timeStamps)].sort();
    }

    // Checks if a given name and attribute pair exists.
    public NameAttributePairExists(stratigraphicName: string | null, surfaceAttribute: string | null): boolean {
        if (!surfaceAttribute || !stratigraphicName) return false;
        return this._surfaceList.some(
            (surface) => surface.stratigraphic_name === stratigraphicName && surface.attribute_name === surfaceAttribute
        );
    }

    // // Get min/max value for a given surface name and attribute.
    // public getMinMax(
    //     stratigraphicName: string | null,
    //     surfaceAttribute: string | null,
    // ): { min: number; max: number } {
    //     if (!surfaceAttribute || !stratigraphicName) return { min: 0, max: 0 };

    //     const filteredList = this.filterOnAttribute(this._surfaceList, surfaceAttribute);
    //     filteredList = this.filterOnName(filteredList, stratigraphicName);
    //     const min = Math.min(...filteredList.map((surface) => surface.value_min));
    //     const max = Math.max(...filteredList.map((surface) => surface.value_max));
    //     return { min, max };
    // }
}

// Filters directory based on time type.
function filterOnTimeType(surfaceList: SurfaceMeta_api[], timeType: TimeType | null): SurfaceMeta_api[] {
    switch (timeType) {
        case TimeType.None:
            return surfaceList.filter((surface) => !surface.iso_date_or_interval);
        case TimeType.Timestamp:
            return surfaceList.filter(
                (surface) => surface.iso_date_or_interval && !IsisoStringInterval(surface.iso_date_or_interval)
            );
        case TimeType.Interval:
            return surfaceList.filter(
                (surface) => surface.iso_date_or_interval && IsisoStringInterval(surface.iso_date_or_interval)
            );
        default:
            return surfaceList;
    }
}

// Filters directory based on a specific surface attribute.
function filterOnAttribute(surfaceList: SurfaceMeta_api[], surfaceAttribute: string | null): SurfaceMeta_api[] {
    return surfaceAttribute
        ? surfaceList.filter((surface) => surface.attribute_name === surfaceAttribute)
        : surfaceList;
}

// Filters directory based on a specific surface name.
function filterOnName(surfaceList: SurfaceMeta_api[], stratigraphicName: string | null): SurfaceMeta_api[] {
    return stratigraphicName
        ? surfaceList.filter((surface) => surface.stratigraphic_name === stratigraphicName)
        : surfaceList;
}

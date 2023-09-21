import { SurfaceAttributeType_api, SurfaceMeta_api } from "@api";
import { isDateInterval, isDateString } from "@framework/utils/timestampUtils";

export enum TimeType {
    None = "None",
    Timestamp = "Timestamp",
    Interval = "Interval",
}
export type SurfaceDirectoryProps = {
    surfaceDirectoryQueryData: SurfaceMeta_api[] | undefined;
    includeAttributeTypes?: SurfaceAttributeType_api[] | null;
    excludeAttributeTypes?: SurfaceAttributeType_api[] | null;
    useObservedSurfaces?: boolean | null;
};
// Class responsible for managing a directory of surfaces.
export class SurfaceDirectory {
    private _surfaceList: SurfaceMeta_api[] = [];

    // Constructs a SurfaceDirectory with optional content filter criteria.
    constructor({
        surfaceDirectoryQueryData,
        includeAttributeTypes,
        excludeAttributeTypes,
        useObservedSurfaces,
    }: SurfaceDirectoryProps) {
        if (!surfaceDirectoryQueryData) return;

        let filteredList = surfaceDirectoryQueryData;

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

    // Filters directory based on time type.
    private filterOnTimeType(surfaceList: SurfaceMeta_api[], timeType: TimeType | null): SurfaceMeta_api[] {
        switch (timeType) {
            case TimeType.None:
                return surfaceList.filter((surface) => !surface.iso_date_or_interval);
            case TimeType.Timestamp:
                return surfaceList.filter(
                    (surface) => surface.iso_date_or_interval && isDateString(surface.iso_date_or_interval)
                );
            case TimeType.Interval:
                return surfaceList.filter(
                    (surface) => surface.iso_date_or_interval && isDateInterval(surface.iso_date_or_interval)
                );
            default:
                return surfaceList;
        }
    }

    // Filters directory based on a specific surface attribute.
    private filterOnAttribute(surfaceList: SurfaceMeta_api[], surfaceAttribute: string | null): SurfaceMeta_api[] {
        return surfaceAttribute
            ? surfaceList.filter((surface) => surface.attribute_name === surfaceAttribute)
            : surfaceList;
    }

    // Filters directory based on a specific surface name.
    private filterOnName(surfaceList: SurfaceMeta_api[], stratigraphicName: string | null): SurfaceMeta_api[] {
        return stratigraphicName
            ? surfaceList.filter((surface) => surface.stratigraphic_name === stratigraphicName)
            : surfaceList;
    }

    // Retrieves unique attributes for a given time type and optional surface name.
    public getAttributeNames(timeType: TimeType | null, stratigraphicName: string | null): string[] {
        let filteredList = this.filterOnTimeType(this._surfaceList, timeType);
        filteredList = this.filterOnName(filteredList, stratigraphicName);
        return [...new Set(filteredList.map((surface) => surface.attribute_name))].sort();
    }

    // Retrieves unique names for a given time type and optional surface attribute.
    public getStratigraphicNames(timeType: TimeType | null, attributeName: string | null): string[] {
        let filteredList = this.filterOnTimeType(this._surfaceList, timeType);
        filteredList = this.filterOnAttribute(filteredList, attributeName);
        return [...new Set(filteredList.map((surface) => surface.stratigraphic_name))];
    }

    // Retrieves unique timestamps for a given surface name and attribute.
    public getTimeStamps(stratigraphicName: string | null, surfaceAttribute: string | null): string[] {
        if (!surfaceAttribute || !stratigraphicName) return [];

        let filteredList = this.filterOnTimeType(this._surfaceList, TimeType.Timestamp);
        filteredList = filteredList.filter(
            (surface) => surface.attribute_name === surfaceAttribute && surface.stratigraphic_name === stratigraphicName
        );
        if (filteredList.length === 0) return [];
        const timeStamps: string[] = [];
        filteredList.forEach((surface) => {
            if (surface.iso_date_or_interval && isDateString(surface.iso_date_or_interval))
                timeStamps.push(surface.iso_date_or_interval);
        });
        return [...new Set(timeStamps)].sort();
    }

    // Retrieves unique time intervals for a given surface name and attribute.
    public getTimeIntervals(stratigraphicName: string | null, surfaceAttribute: string | null): string[] {
        if (!surfaceAttribute || !stratigraphicName) return [];

        let filteredList = this.filterOnTimeType(this._surfaceList, TimeType.Interval);
        filteredList = filteredList.filter(
            (surface) => surface.attribute_name === surfaceAttribute && surface.stratigraphic_name === stratigraphicName
        );
        if (filteredList.length === 0) return [];
        const timeIntervals: string[] = [];
        filteredList.forEach((surface) => {
            if (surface.iso_date_or_interval && isDateInterval(surface.iso_date_or_interval))
                timeIntervals.push(surface.iso_date_or_interval);
        });
        return [...new Set(timeIntervals)].sort();
    }

    // Checks if a given name and attribute pair exists.
    public NameAttributePairExists(
        stratigraphicName: string | null,
        surfaceAttribute: string | null,
        timeType: TimeType | null
    ): boolean {
        if (!surfaceAttribute || !stratigraphicName) return false;

        const filteredList = this.filterOnTimeType(this._surfaceList, timeType);
        return filteredList.some(
            (surface) => surface.stratigraphic_name === stratigraphicName && surface.attribute_name === surfaceAttribute
        );
    }

    // // Get min/max value for a given surface name and attribute.
    // public getMinMax(
    //     stratigraphicName: string | null,
    //     surfaceAttribute: string | null,
    //     timeType: TimeType | null
    // ): { min: number; max: number } {
    //     if (!surfaceAttribute || !stratigraphicName) return { min: 0, max: 0 };
    //     let filteredList = this.filterOnTimeType(this._surfaceList, timeType);
    //     filteredList = this.filterOnAttribute(this._surfaceList, surfaceAttribute);
    //     filteredList = this.filterOnName(filteredList, stratigraphicName);
    //     const min = Math.min(...filteredList.map((surface) => surface.value_min));
    //     const max = Math.max(...filteredList.map((surface) => surface.value_max));
    //     return { min, max };
    // }
}

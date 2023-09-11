import { SurfaceMeta_api } from "@api";

export type SurfaceMeta = {
    name: string;
    tagname: string;
    t_start: string | null;
    t_end: string | null;
    content: string;
    is_observation: boolean;
    is_stratigraphic: boolean;
    zmin: number;
    zmax: number;
};

//Sumo content types
export enum SurfaceContent {
    Depth = "depth",
    Time = "time",
    Thickness = "thickness",
    Property = "property",
    Seismic = "seismic",
}

export enum TimeType {
    None = "None",
    Timestamp = "Timestamp",
    Interval = "Interval",
}
export type SurfaceDirectoryProps = {
    surfaceDirectoryQueryData: SurfaceMeta_api[] | undefined;
    includeContent?: SurfaceContent[] | null;
    excludeContent?: SurfaceContent[] | null;
    useObservedSurfaces?: boolean | null;
};
// Class responsible for managing a directory of surfaces.
export class SurfaceDirectory {
    private _surfaceList: SurfaceMeta_api[] = [];

    // Constructs a SurfaceDirectory with optional content filter criteria.
    constructor({
        surfaceDirectoryQueryData,
        includeContent,
        excludeContent,
        useObservedSurfaces,
    }: SurfaceDirectoryProps) {
        if (!surfaceDirectoryQueryData) return;

        let filteredList = surfaceDirectoryQueryData;

        if (includeContent && includeContent.length) {
            filteredList = filteredList.filter((surface) => includeContent.includes(surface.content as SurfaceContent));
        }
        if (excludeContent && excludeContent.length) {
            filteredList = filteredList.filter(
                (surface) => !excludeContent.includes(surface.content as SurfaceContent)
            );
        }
        useObservedSurfaces
            ? (filteredList = filteredList.filter((surface) => surface.is_observation))
            : (filteredList = filteredList.filter((surface) => !surface.is_observation));

        this._surfaceList = filteredList;
    }

    // Filters directory based on time type.
    private filterOnTimeType(surfaceList: SurfaceMeta_api[], timeType: TimeType | null): SurfaceMeta_api[] {
        if (!timeType) return surfaceList;

        switch (timeType) {
            case TimeType.None:
                return surfaceList.filter((surface) => !surface.t_start && !surface.t_end);
            case TimeType.Timestamp:
                return surfaceList.filter((surface) => surface.t_start && !surface.t_end);
            default:
                return surfaceList.filter((surface) => surface.t_start && surface.t_end);
        }
    }

    // Filters directory based on a specific surface attribute.
    private filterOnAttribute(surfaceList: SurfaceMeta_api[], surfaceAttribute: string | null): SurfaceMeta_api[] {
        return surfaceAttribute ? surfaceList.filter((surface) => surface.tagname === surfaceAttribute) : surfaceList;
    }

    // Filters directory based on a specific surface name.
    private filterOnName(surfaceList: SurfaceMeta_api[], name: string | null): SurfaceMeta_api[] {
        return name ? surfaceList.filter((surface) => surface.name === name) : surfaceList;
    }

    // Retrieves unique attributes for a given time type and optional surface name.
    public getAttributes(timeType: TimeType | null, surfaceName: string | null): string[] {
        let filteredList = this.filterOnTimeType(this._surfaceList, timeType);
        filteredList = this.filterOnName(filteredList, surfaceName);
        return [...new Set(filteredList.map((surface) => surface.tagname))].sort();
    }

    // Retrieves unique names for a given time type and optional surface attribute.
    public getNames(timeType: TimeType | null, surfaceAttribute: string | null): string[] {
        let filteredList = this.filterOnTimeType(this._surfaceList, timeType);
        filteredList = this.filterOnAttribute(filteredList, surfaceAttribute);
        return [...new Set(filteredList.map((surface) => surface.name))].sort();
    }

    // Retrieves unique timestamps for a given surface name and attribute.
    public getTimeStamps(surfaceName: string | null, surfaceAttribute: string | null): string[] {
        if (!surfaceAttribute || !surfaceName) return [];

        let filteredList = this.filterOnTimeType(this._surfaceList, TimeType.Timestamp);
        filteredList = filteredList.filter(
            (surface) => surface.tagname === surfaceAttribute && surface.name === surfaceName
        );
        if (filteredList.length === 0) return [];
        const timeStamps: string[] = [];
        filteredList.forEach((surface) => {
            if (surface.t_start) timeStamps.push(surface.t_start);
        });
        return [...new Set(timeStamps)].sort();
    }

    // Retrieves unique time intervals for a given surface name and attribute.
    public getTimeIntervals(surfaceName: string | null, surfaceAttribute: string | null): string[] {
        if (!surfaceAttribute || !surfaceName) return [];

        let filteredList = this.filterOnTimeType(this._surfaceList, TimeType.Interval);
        filteredList = filteredList.filter(
            (surface) => surface.tagname === surfaceAttribute && surface.name === surfaceName
        );
        if (filteredList.length === 0) return [];
        const timeIntervals: string[] = [];
        filteredList.forEach((surface) => {
            if (surface.t_start && surface.t_end) timeIntervals.push(`${surface.t_start}--${surface.t_end}`);
        });
        return [...new Set(timeIntervals)].sort();
    }

    // Checks if a given name and attribute pair exists.
    public NameAttributePairExists(
        surfaceName: string | null,
        surfaceAttribute: string | null,
        timeType: TimeType | null
    ): boolean {
        if (!surfaceAttribute || !surfaceName) return false;

        const filteredList = this.filterOnTimeType(this._surfaceList, timeType);
        return filteredList.some((surface) => surface.name === surfaceName && surface.tagname === surfaceAttribute);
    }

    // Get min/max value for a given surface name and attribute.
    public getMinMax(
        surfaceName: string | null,
        surfaceAttribute: string | null,
        timeType: TimeType | null
    ): { min: number; max: number } {
        if (!surfaceAttribute || !surfaceName) return { min: 0, max: 0 };
        let filteredList = this.filterOnTimeType(this._surfaceList, timeType);
        filteredList = this.filterOnAttribute(this._surfaceList, surfaceAttribute);
        filteredList = this.filterOnName(filteredList, surfaceName);
        const min = Math.min(...filteredList.map((surface) => surface.zmin));
        const max = Math.max(...filteredList.map((surface) => surface.zmax));
        return { min, max };
    }
}

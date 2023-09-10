import { SurfaceMeta_api } from "@api";
import { UseQueryResult } from "@tanstack/react-query";

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
export enum TimeType {
    None = "None",
    Timestamp = "Timestamp",
    Interval = "Interval",
}

export class SurfaceDirectoryProvider {
    private _surfaceList: SurfaceMeta_api[] = [];
    private _timeType: TimeType;
    constructor(
        surfaceDirectoryQuery: UseQueryResult<SurfaceMeta_api[]>,
        timeType: TimeType,
        content: string[] | null
    ) {
        if (surfaceDirectoryQuery.data) {
            let filterTimeType: (surface: SurfaceMeta_api) => boolean;
            switch (timeType) {
                case TimeType.None:
                    console.log("no time");
                    filterTimeType = (surface) => !surface.t_start && !surface.t_end;
                    break;
                case TimeType.Timestamp:
                    console.log("timestamp");
                    filterTimeType = (surface) => surface.t_start != null && surface.t_end == null;
                    break;
                default:
                    console.log("interval");
                    filterTimeType = (surface) => surface.t_start != null && surface.t_end != null;
                    break;
            }

            if (content && content.length > 0) {
                console.log("has content", content);
                const filterContent = (surface: SurfaceMeta_api) => content.includes(surface.content);
                this._surfaceList = [
                    ...new Set(surfaceDirectoryQuery.data.filter(filterTimeType).filter(filterContent)),
                ];
            } else {
                console.log("no content", filterTimeType);
                this._surfaceList = [...new Set(surfaceDirectoryQuery.data.filter(filterTimeType))];
            }
        }
        console.log("surface list", this._surfaceList);
        this._timeType = timeType;
    }

    public getAttributes(): string[] {
        return [...new Set(this._surfaceList.map((surface) => surface.tagname))];
    }
    public getNames(attribute: string | null): string[] {
        if (!attribute) return [];

        return [...this._surfaceList.filter((surface) => surface.tagname === attribute).map((surface) => surface.name)];
    }
    public getTimeStamps(surfaceName: string | null, attribute: string | null): (string | undefined)[] {
        if (!attribute || !surfaceName || this._timeType !== TimeType.Timestamp) return [];

        return [
            ...new Set(
                this._surfaceList
                    .filter(
                        (surface) => surface.tagname === attribute && surface.name === surfaceName && surface.t_start
                    )
                    .map((surface) => surface.t_start)
            ),
        ];
    }
    public getTimeIntervals(surfaceName: string | null, attribute: string | null): (string | undefined)[] {
        if (!attribute || !surfaceName || this._timeType !== TimeType.Interval) return [];

        return [
            ...new Set(
                this._surfaceList
                    .filter(
                        (surface) =>
                            surface.tagname === attribute &&
                            surface.name === surfaceName &&
                            surface.t_start &&
                            surface.t_end
                    )
                    .map((surface) => `${surface.t_start} - ${surface.t_end}`)
            ),
        ];
    }
    public NameAttributePairExists(surfaceName: string | null, attribute: string | null): boolean {
        return (
            this._surfaceList.filter((surface) => surface.name === surfaceName && surface.tagname === attribute)
                .length > 0
        );
    }
}

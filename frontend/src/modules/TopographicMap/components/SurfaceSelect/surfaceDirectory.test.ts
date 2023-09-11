import { SurfaceMeta_api } from "@api";

import { SurfaceContent, SurfaceDirectory, TimeType } from "./surfaceDirectory";

const surfaceMetaArr: SurfaceMeta_api[] = [
    {
        name: "surface1",
        tagname: "tagA",
        t_start: "2023-09-11",
        t_end: undefined,
        content: SurfaceContent.Seismic,
        is_observation: false,
        is_stratigraphic: true,
        zmin: 0,
        zmax: 10,
    },
    {
        name: "surface2",
        tagname: "tagB",
        t_start: "2023-09-12",
        t_end: "2023-09-13",
        content: SurfaceContent.Property,
        is_observation: true,
        is_stratigraphic: false,
        zmin: 5,
        zmax: 15,
    },
    {
        name: "surface3",
        tagname: "tagA",
        t_start: undefined,
        t_end: undefined,
        content: SurfaceContent.Depth,
        is_observation: false,
        is_stratigraphic: false,
        zmin: 10,
        zmax: 20,
    },
];

describe("SurfaceDirectory tests", () => {
    test("initialize SurfaceDirectory with empty query", () => {
        const dir = new SurfaceDirectory({ surfaceDirectoryQueryData: [] });
        expect(dir.getAttributes(TimeType.None, null)).toEqual([]);
    });

    test("filter on time type Timestamp", () => {
        const dir = new SurfaceDirectory({ surfaceDirectoryQueryData: surfaceMetaArr });
        const names = dir.getNames(TimeType.Timestamp, "tagA");
        expect(names).toEqual(["surface1"]);
    });

    test("filter on attribute 'tagA'", () => {
        const dir = new SurfaceDirectory({
            surfaceDirectoryQueryData: surfaceMetaArr,
            includeContent: [SurfaceContent.Seismic],
        });
        const names = dir.getNames(TimeType.None, "tagA");
        expect(names).toEqual(["surface1"]);
    });

    test("retrieve unique timestamps", () => {
        const dir = new SurfaceDirectory({ surfaceDirectoryQueryData: surfaceMetaArr });
        const timestamps = dir.getTimeStamps("surface1", "tagA");
        expect(timestamps).toEqual(["2023-09-11"]);
    });

    test("retrieve unique time intervals", () => {
        const dir = new SurfaceDirectory({ surfaceDirectoryQueryData: surfaceMetaArr });
        const timeIntervals = dir.getTimeIntervals("surface2", "tagB");
        expect(timeIntervals).toEqual(["2023-09-12 - 2023-09-13"]);
    });

    test("check if NameAttributePair exists", () => {
        const dir = new SurfaceDirectory({ surfaceDirectoryQueryData: surfaceMetaArr });
        expect(dir.NameAttributePairExists("surface3", "tagA", TimeType.None)).toBe(true);
        expect(dir.NameAttributePairExists("surface3", "tagZ", TimeType.None)).toBe(false);
    });
});

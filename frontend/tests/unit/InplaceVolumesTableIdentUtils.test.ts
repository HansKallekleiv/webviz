import { describe, expect, test } from "vitest";

import { InplaceVolumesTableSource_api } from "@api";
import {
    decodeTableKey,
    encodeTableKey,
    formatTableDisplayName,
    getTableKeyFromDefinition,
} from "@modules/_shared/InplaceVolumes/tableIdentUtils";

describe("tableIdentUtils", () => {
    test("encodes static table keys as plain tableName for persistence compatibility", () => {
        expect(encodeTableKey("geogrid", InplaceVolumesTableSource_api.STATIC)).toBe("geogrid");
        expect(encodeTableKey("simgrid", InplaceVolumesTableSource_api.STATIC)).toBe("simgrid");
    });

    test("encodes simulator table keys with simulator:: prefix", () => {
        expect(encodeTableKey("simgrid", InplaceVolumesTableSource_api.SIMULATOR)).toBe("simulator::simgrid");
    });

    test("decodes simulator-prefixed keys and falls back to STATIC for plain legacy keys", () => {
        expect(decodeTableKey("simulator::simgrid")).toEqual({
            tableName: "simgrid",
            tableSource: InplaceVolumesTableSource_api.SIMULATOR,
        });
        expect(decodeTableKey("simgrid")).toEqual({
            tableName: "simgrid",
            tableSource: InplaceVolumesTableSource_api.STATIC,
        });
    });

    test("formats display names for static, simulator, and already-formatted keys", () => {
        expect(formatTableDisplayName("geogrid")).toBe("geogrid");
        expect(formatTableDisplayName("simulator::simgrid")).toBe("simgrid (simulator)");
        expect(formatTableDisplayName("simgrid (simulator)")).toBe("simgrid (simulator)");
    });

    test("extracts encoded key from table definition", () => {
        expect(
            getTableKeyFromDefinition({
                tableName: "simgrid",
                tableSource: InplaceVolumesTableSource_api.STATIC,
            }),
        ).toBe("simgrid");
        expect(
            getTableKeyFromDefinition({
                tableName: "simgrid",
                tableSource: InplaceVolumesTableSource_api.SIMULATOR,
            }),
        ).toBe("simulator::simgrid");
    });
});

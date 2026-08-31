import type { QueryClient } from "@tanstack/query-core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
    getDeltaEnsembleVectorListOptions,
    getInplaceTableDefinitionsOptions,
    getVectorListOptions,
} from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import {
    fetchInplaceVolumesTableDefinitionsCatalogue,
    fetchVectorListCatalogue,
} from "@framework/domain/metadataCatalogues";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

vi.mock("@api", () => ({
    getDeltaEnsembleVectorListOptions: vi.fn(() => ({ queryKey: ["delta-vectors"] })),
    getInplaceTableDefinitionsOptions: vi.fn(() => ({ queryKey: ["table-definitions"] })),
    getVectorListOptions: vi.fn(() => ({ queryKey: ["vectors"] })),
}));

vi.mock("@framework/utils/queryUtils", () => ({
    makeCacheBustingQueryParam: vi.fn(() => ({ zCacheBust: "fingerprint" })),
}));

const FIRST_UUID = "00000000-0000-4000-8000-000000000001";
const SECOND_UUID = "00000000-0000-4000-8000-000000000002";

describe("metadata catalogues", () => {
    const fetchQuery = vi.fn().mockResolvedValue([]);
    const queryClient = { fetchQuery } as unknown as QueryClient;
    const first = new RegularEnsembleIdent(FIRST_UUID, "first");
    const second = new RegularEnsembleIdent(SECOND_UUID, "second");

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("selects regular and delta vector-list endpoints", async () => {
        await fetchVectorListCatalogue(queryClient, first);
        expect(getVectorListOptions).toHaveBeenCalledWith({
            query: {
                case_uuid: FIRST_UUID,
                ensemble_name: "first",
                include_derived_vectors: true,
                zCacheBust: "fingerprint",
            },
            signal: undefined,
        });

        const delta = new DeltaEnsembleIdent(first, second);
        await fetchVectorListCatalogue(queryClient, delta);
        expect(getDeltaEnsembleVectorListOptions).toHaveBeenCalledWith({
            query: {
                comparison_case_uuid: FIRST_UUID,
                comparison_ensemble_name: "first",
                reference_case_uuid: SECOND_UUID,
                reference_ensemble_name: "second",
                include_derived_vectors: true,
                zCacheBust: "fingerprint",
            },
            signal: undefined,
        });
        expect(makeCacheBustingQueryParam).toHaveBeenLastCalledWith(first, second);
    });

    test("fetches inplace table definitions for a regular ensemble", async () => {
        await fetchInplaceVolumesTableDefinitionsCatalogue(queryClient, first);
        expect(getInplaceTableDefinitionsOptions).toHaveBeenCalledWith({
            query: {
                case_uuid: FIRST_UUID,
                ensemble_name: "first",
                zCacheBust: "fingerprint",
            },
            signal: undefined,
        });
        expect(fetchQuery).toHaveBeenCalledWith({ queryKey: ["table-definitions"] });
    });
});
import { expect, test as base } from "@playwright/test";
import type { RequestHandler } from "msw";

import { installMockApi } from "../../mocks/playwright/installMockApi";
import type { MockApi } from "../../mocks/playwright/installMockApi";
import { basicEnsembleHandlers } from "../../mocks/scenarios/basicEnsemble";

import { MOCK_BASE_URL } from "./mockServer";

export { expect, MOCK_BASE_URL };
export type { MockApi };

type MockApiFixtures = {
    mockApi: MockApi;
    scenario: RequestHandler[];
};

export const test = base.extend<MockApiFixtures>({
    scenario: [basicEnsembleHandlers, { option: true }],

    mockApi: [
        async ({ context, scenario }, provide) => {
            const mockApi = await installMockApi(context, { baseUrl: MOCK_BASE_URL, scenario });
            await provide(mockApi);
            mockApi.assertClean();
        },
        { auto: true },
    ],
});

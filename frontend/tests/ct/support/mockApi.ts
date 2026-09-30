import { expect, test as base } from "@playwright/experimental-ct-react";
import type { RequestHandler } from "msw";

import { installMockApi } from "../../mocks/playwright/installMockApi";
import type { MockApi } from "../../mocks/playwright/installMockApi";
import { basicEnsembleHandlers } from "../../mocks/scenarios/basicEnsemble";

import { CT_PORT } from "./ctServer";

export { expect };
export type { MockApi };

type MockApiFixtures = {
    mockApi: MockApi;
    scenario: RequestHandler[];
};

export const test = base.extend<MockApiFixtures>({
    scenario: [basicEnsembleHandlers, { option: true }],

    mockApi: [
        async ({ context, scenario }, provide) => {
            const mockApi = await installMockApi(context, { baseUrl: `http://localhost:${CT_PORT}`, scenario });
            await provide(mockApi);
            mockApi.assertClean();
        },
        { auto: true },
    ],
});

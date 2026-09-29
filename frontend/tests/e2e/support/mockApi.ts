import { expect, test as base } from "@playwright/test";
import { getResponse } from "msw";
import type { RequestHandler } from "msw";

import { basicEnsembleHandlers } from "../../mocks/scenarios/basicEnsemble";

export { expect };

/** Must match `baseURL` in tests/e2e/_playwright.mocked.config.ts */
export const MOCK_BASE_URL = "http://localhost:5174";

export type MockApi = {
    /** Prepend handlers; they take effect for subsequent requests. */
    use: (...handlers: RequestHandler[]) => void;
    /** "<METHOD> <path>?<query>" for every /api request answered by a handler. */
    handledRequests: () => string[];
    /** "<METHOD> <path>" for every /api request without a handler (answered with 501). */
    unhandledRequests: () => string[];
    /** "<METHOD> <url>" for every aborted external request. */
    blockedRequests: () => string[];
    /** Skip the teardown check for unhandled and blocked requests. */
    allowUnhandled: () => void;
};

type MockApiFixtures = {
    mockApi: MockApi;
    scenario: RequestHandler[];
};

const CONTEXT_CLOSED_ERROR = /closed|already handled/i;

// Allow-listed external requests, answered with an empty stylesheet (index.html links the Equinor font CDN)
const STUBBED_EXTERNAL_URLS = new Set(["https://cdn.eds.equinor.com/font/equinor-font.css"]);

export const test = base.extend<MockApiFixtures>({
    scenario: [basicEnsembleHandlers, { option: true }],

    mockApi: [
        async ({ context, scenario }, provide) => {
            const overrides: RequestHandler[] = [];
            const handled: string[] = [];
            const unhandled: string[] = [];
            const blocked: string[] = [];
            let unhandledAllowed = false;

            await context.addInitScript(() => {
                localStorage.setItem("disableChangelogPopup", "true");
                localStorage.setItem("devToolsVisible", "false");
                localStorage.setItem("webvizDebug_forceDevMode", "false");
            });

            const apiPrefix = `${MOCK_BASE_URL}/api/`;

            await context.route("**/*", async (route) => {
                const request = route.request();
                const url = request.url();

                if (url.startsWith("data:") || url.startsWith("blob:")) {
                    await route.fallback();
                    return;
                }

                try {
                    if (url.startsWith(apiPrefix)) {
                        const parsedUrl = new URL(url);
                        const method = request.method();
                        const body = request.postDataBuffer();
                        const hasBody = body !== null && method !== "GET" && method !== "HEAD";

                        const mswRequest = new Request(url, {
                            method,
                            headers: request.headers(),
                            body: hasBody ? new Uint8Array(body) : undefined,
                        });
                        const response = await getResponse([...overrides, ...scenario], mswRequest);

                        if (!response) {
                            unhandled.push(`${method} ${parsedUrl.pathname}`);
                            await route.fulfill({
                                status: 501,
                                contentType: "application/json",
                                body: JSON.stringify({
                                    error: {
                                        type: "UnmockedRequest",
                                        message: `No mock handler for ${method} ${parsedUrl.pathname}`,
                                    },
                                }),
                            });
                            return;
                        }

                        handled.push(`${method} ${parsedUrl.pathname}${parsedUrl.search}`);
                        await route.fulfill({
                            status: response.status,
                            headers: Object.fromEntries(response.headers),
                            body: Buffer.from(await response.arrayBuffer()),
                        });
                        return;
                    }

                    if (url.startsWith(MOCK_BASE_URL)) {
                        await route.fallback();
                        return;
                    }

                    if (STUBBED_EXTERNAL_URLS.has(url)) {
                        await route.fulfill({ status: 200, contentType: "text/css", body: "" });
                        return;
                    }

                    blocked.push(`${request.method()} ${url}`);
                    await route.abort();
                } catch (error) {
                    // The page can close while a request is in flight
                    if (!(error instanceof Error && CONTEXT_CLOSED_ERROR.test(error.message))) {
                        throw error;
                    }
                }
            });

            const prependHandlers = (...handlers: RequestHandler[]) => {
                overrides.unshift(...handlers);
            };

            const mockApi: MockApi = {
                use: prependHandlers,
                handledRequests: () => [...handled],
                unhandledRequests: () => [...unhandled],
                blockedRequests: () => [...blocked],
                allowUnhandled: () => {
                    unhandledAllowed = true;
                },
            };

            await provide(mockApi);

            if (!unhandledAllowed) {
                expect(unhandled, "Unmocked /api requests").toEqual([]);
                expect(blocked, "Blocked external requests").toEqual([]);
            }
        },
        { auto: true },
    ],
});

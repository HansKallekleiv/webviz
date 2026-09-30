import { expect } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";
import { getResponse } from "msw";
import type { RequestHandler } from "msw";

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

export type InstalledMockApi = MockApi & {
    /** Fails on unhandled or blocked requests, unless allowUnhandled() was called. */
    assertClean: () => void;
};

export type InstallMockApiOptions = {
    /** Origin of the app under test; `${baseUrl}/api/` is mocked, other same-origin requests pass through. */
    baseUrl: string;
    scenario: RequestHandler[];
};

const CONTEXT_CLOSED_ERROR = /closed|already handled/i;

// Allow-listed external requests, answered with an empty stylesheet (index.html links the Equinor font CDN)
const STUBBED_EXTERNAL_URLS = new Set(["https://cdn.eds.equinor.com/font/equinor-font.css"]);

export async function installMockApi(
    context: BrowserContext,
    { baseUrl, scenario }: InstallMockApiOptions,
): Promise<InstalledMockApi> {
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

    const apiPrefix = `${baseUrl}/api/`;

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

            if (url.startsWith(baseUrl)) {
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

    return {
        use: prependHandlers,
        handledRequests: () => [...handled],
        unhandledRequests: () => [...unhandled],
        blockedRequests: () => [...blocked],
        allowUnhandled: () => {
            unhandledAllowed = true;
        },
        assertClean: () => {
            if (unhandledAllowed) {
                return;
            }
            expect(unhandled, "Unmocked /api requests").toEqual([]);
            expect(blocked, "Blocked external requests").toEqual([]);
        },
    };
}

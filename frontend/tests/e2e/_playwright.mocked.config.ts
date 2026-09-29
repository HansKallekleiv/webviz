import { defineConfig, devices } from "@playwright/test";

import { MOCK_BASE_URL, MOCK_PORT } from "./support/mockServer";

/**
 * Offline e2e: no backend, every /api request is answered by MSW handlers (see support/mockApi.ts).
 * Server modes (npm run test:e2e:mocked):
 * - default: `vite build` (checker off, no tsc) into dist/, then `vite preview`. Fast and stable.
 * - E2E_MOCKED_SKIP_BUILD=1: preview the existing dist/ without building (CI after `npm run build`, quick reruns).
 * - E2E_MOCKED_DEV=1: Vite dev server, for writing specs in --ui mode. Slow, flaky above ~4 workers.
 */
const devMode = !!process.env.E2E_MOCKED_DEV;
const skipBuild = !!process.env.E2E_MOCKED_SKIP_BUILD;

const serveCommand = devMode
    ? `npx vite --port ${MOCK_PORT} --strictPort`
    : `${skipBuild ? "" : "npx vite build && "}npx vite preview --port ${MOCK_PORT} --strictPort`;

export default defineConfig({
    testDir: "./mocked",
    timeout: 60_000,
    outputDir: "../../test-results/mocked",
    fullyParallel: true,
    workers: process.env.CI ? 2 : devMode ? 4 : undefined,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["html", { open: "never", outputFolder: "../../playwright-report/mocked" }]] : "list",
    use: {
        baseURL: MOCK_BASE_URL,
        trace: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            // Full HD so the module list is not scrolled off-screen when dragging a module
            use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
        },
    ],
    webServer: {
        command: serveCommand,
        url: MOCK_BASE_URL,
        // Vite must run from the frontend root, not from the config directory
        cwd: "../..",
        env: { WEBVIZ_E2E_MOCKED: "1", NODE_OPTIONS: "--max-old-space-size=8192" },
        // A stale server already listening on the port is reused, even if it serves an old build
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
    },
});

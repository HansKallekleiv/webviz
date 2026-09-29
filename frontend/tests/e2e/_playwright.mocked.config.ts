import { defineConfig, devices } from "@playwright/test";

const PORT = 5174;

/** Offline e2e: only Vite runs, every /api request is answered by MSW handlers (see support/mockApi.ts). */
export default defineConfig({
    testDir: "./mocked",
    timeout: 60_000,
    outputDir: "../../test-results/mocked",
    fullyParallel: true,
    // Every worker loads the unbundled app from the same Vite dev server; more workers than this get flaky
    workers: process.env.CI ? 2 : 4,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["html", { open: "never", outputFolder: "../../playwright-report/mocked" }]] : "list",
    use: {
        baseURL: `http://localhost:${PORT}`,
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
        command: `npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        // Vite must run from the frontend root, not from the config directory
        cwd: "../..",
        env: { WEBVIZ_E2E_MOCKED: "1" },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});

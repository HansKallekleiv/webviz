import { defineConfig, devices } from "@playwright/test";

const PORT = 5174;

/** Offline e2e: only Vite runs, every /api request is answered by MSW handlers (see support/mockApi.ts). */
export default defineConfig({
    testDir: "./mocked",
    outputDir: "../../test-results/mocked",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["html", { open: "never", outputFolder: "../../playwright-report/mocked" }]] : "list",
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "retain-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: `npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        env: { WEBVIZ_E2E_MOCKED: "1" },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});

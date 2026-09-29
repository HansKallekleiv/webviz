import { expect, test } from "../support/mockApi";

test.describe("mockApi safety net", () => {
    test("records unmocked /api requests and blocks external requests", async ({ page, mockApi }) => {
        mockApi.allowUnhandled();

        await page.goto("/");
        await expect(page.getByRole("button", { name: "New session" })).toBeVisible();

        const result = await page.evaluate(async () => {
            const api = await fetch("/api/__not_an_endpoint__");
            const external = await fetch("https://example.com/").then(
                () => "reached",
                () => "blocked",
            );
            return { apiStatus: api.status, external };
        });

        expect(result).toEqual({ apiStatus: 501, external: "blocked" });
        expect(mockApi.unhandledRequests()).toContain("GET /api/__not_an_endpoint__");
        expect(mockApi.blockedRequests()).toContainEqual(expect.stringContaining("https://example.com/"));
    });

    test("boot needs no unmocked requests", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("button", { name: "New session" })).toBeVisible();
        // Teardown asserts that nothing was unhandled or blocked.
    });
});

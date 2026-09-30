import type { Page } from "@playwright/test";
import { http, HttpResponse } from "msw";

import { apiUrl } from "../../mocks/apiUrl";
import { SYNTH, SYNTH_SURFACES } from "../../mocks/syntheticField";
import { expect, test } from "../support/mockApi";
import { addModule, addSyntheticEnsemble, expectSurfaceRendered } from "../support/mockedFlows";

const TWO_D_VIEWER = "2D Viewer";

async function addDepthSurfaceLayer(page: Page): Promise<void> {
    await addSyntheticEnsemble(page);
    await addModule(page, TWO_D_VIEWER);

    const expandSettingsButton = page.getByTitle("Expand settings panel");
    if (await expandSettingsButton.isVisible()) {
        await expandSettingsButton.click();
    }

    await page.getByRole("button", { name: "Add first view" }).click();
    await page.getByRole("button", { name: "Add", exact: true }).last().click();
    await page.getByRole("menuitem", { name: "Layers", exact: true }).hover();
    await page.getByRole("menuitem", { name: "Surfaces", exact: true }).hover();
    await page.getByRole("menuitem", { name: "Depth", exact: true }).click();
}

test.describe("2D Viewer (mocked API)", () => {
    test("renders a synthetic realization depth surface", async ({ page, mockApi }) => {
        await addDepthSurfaceLayer(page);

        await expectSurfaceRendered(page);

        const dataRequest = mockApi.handledRequests().find((r) => r.startsWith("GET /api/surface/surface_data"));
        expect(dataRequest).toBeDefined();
        const surfAddrStr = new URL(dataRequest!.slice("GET ".length), "http://x").searchParams.get("surf_addr_str");
        expect(surfAddrStr).toContain(`REAL~~${SYNTH.caseUuid}~~${SYNTH.ensembleName}~~${SYNTH_SURFACES.names[0]}`);
        expect(dataRequest).toContain("data_format=float");
    });

    test("shows an error state when surface data fails", async ({ page, mockApi }) => {
        mockApi.use(
            http.get(apiUrl("/surface/surface_data"), () =>
                HttpResponse.json({ error: { type: "InternalError", message: "boom" } }, { status: 500 }),
            ),
        );

        await addDepthSurfaceLayer(page);

        await expect(page.locator("svg.text-danger-subtle").first()).toBeVisible();
        await expect(page.locator("svg.text-success-subtle")).toHaveCount(0);
    });
});

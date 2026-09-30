import type { Page } from "@playwright/test";
import { http, HttpResponse } from "msw";

import { apiUrl } from "../mocks/apiUrl";
import { SYNTH } from "../mocks/syntheticField";

import { CaseExplorerHarness } from "./support/CaseExplorerHarness";
import { expect, test } from "./support/mockApi";

async function selectSynthAsset(page: Page): Promise<void> {
    await page.getByRole("combobox", { name: "Asset" }).click();
    await page.getByRole("option", { name: SYNTH.assetName }).click();
}

test.describe("CaseExplorer (mocked API)", () => {
    test("lists the synthetic case and reports the selection", async ({ mount, page }) => {
        const component = await mount(<CaseExplorerHarness />);
        await selectSynthAsset(page);

        const row = component.locator("tbody").getByRole("row", { name: new RegExp(SYNTH.caseName) });
        await expect(row).toHaveCount(1);
        await row.click();

        await expect(component.getByTestId("case-selection")).toHaveText(`${SYNTH.caseUuid}:${SYNTH.ensembleName}`);
    });

    test("shows an error when cases cannot be loaded", async ({ mount, page, mockApi }) => {
        mockApi.use(
            http.get(apiUrl("/cases"), () =>
                HttpResponse.json({ error: { type: "InternalError", message: "boom" } }, { status: 500 }),
            ),
        );

        const component = await mount(<CaseExplorerHarness />);
        await selectSynthAsset(page);

        await expect(component.getByText(/error/i).first()).toBeVisible();
        await expect(component.locator("tbody").getByRole("row", { name: new RegExp(SYNTH.caseName) })).toHaveCount(0);
    });

    test("sends no case queries while queries are disabled", async ({ mount, mockApi }) => {
        const component = await mount(<CaseExplorerHarness queriesDisabled />);

        await expect(component.getByTestId("case-selection")).toHaveText("none");
        await expect.poll(() => mockApi.handledRequests().some((r) => r.startsWith("GET /api/logged_in_user"))).toBe(true);
        expect(mockApi.handledRequests().filter((r) => /^GET \/api\/(asset_infos|cases)/.test(r))).toEqual([]);
    });

    test("catches unmocked /api requests in component tests", async ({ mount, page, mockApi }) => {
        mockApi.allowUnhandled();
        await mount(<CaseExplorerHarness queriesDisabled />);

        const status = await page.evaluate(async () => (await fetch("/api/__not_an_endpoint__")).status);

        expect(status).toBe(501);
        expect(mockApi.unhandledRequests()).toContain("GET /api/__not_an_endpoint__");
    });
});

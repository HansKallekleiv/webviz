import type { Page } from "@playwright/test";
import { http, HttpResponse } from "msw";

import { apiUrl } from "../../mocks/apiUrl";
import { SYNTH } from "../../mocks/syntheticField";
import { expect, test } from "../support/mockApi";
import { dragModuleOntoLayout } from "../support/walkthroughHelpers";

const SIMULATION_TIME_SERIES = "Simulation Time Series";

async function addSyntheticEnsembleAndModule(page: Page): Promise<void> {
    await page.goto("/");
    await page.getByRole("button", { name: "New session" }).click();

    await expect(page.getByText("Ensembles used in this session")).toBeVisible();
    await page.getByTestId("add-regular-ensemble-button").click();
    await page.getByRole("combobox", { name: "Asset" }).click();
    await page.getByRole("option", { name: SYNTH.assetName }).click();

    await page.getByPlaceholder("Filter ...").first().fill(SYNTH.caseUuid);
    await page
        .locator("tbody")
        .getByRole("row", { name: new RegExp(SYNTH.caseUuid) })
        .first()
        .click();
    await page.getByText(SYNTH.ensembleName).first().click();
    await page.getByRole("button", { name: "Apply" }).last().click();
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Ensembles used in this session")).not.toBeVisible();

    const moduleListItem = page.locator(`[title="${SIMULATION_TIME_SERIES}"]`).first();
    if (!(await moduleListItem.isVisible())) {
        await page.getByTestId("modules-list-open-button").click();
    }
    await dragModuleOntoLayout(page, SIMULATION_TIME_SERIES);

    const expandSettingsButton = page.getByTitle("Expand settings panel");
    if (await expandSettingsButton.isVisible()) {
        await expandSettingsButton.click();
    }

    const vectorSelector = page.getByTestId("vector-selector");
    const vectorInput = vectorSelector.locator("input").last();
    await vectorInput.click();
    await vectorInput.pressSequentially("FOPR");
    await vectorInput.press("Enter");
    await expect(vectorSelector.locator('li[title="FOPR"]')).toHaveCount(1);
}

test.describe("Simulation Time Series (mocked API)", () => {
    test("renders a statistical FOPR chart for the synthetic ensemble", async ({ page, mockApi }) => {
        await addSyntheticEnsembleAndModule(page);

        const plot = page.getByTestId("module-layout").locator(".js-plotly-plot").first();
        await expect(plot.locator(".scatterlayer .js-line").first()).toBeVisible();

        const statsRequest = mockApi
            .handledRequests()
            .find((r) => r.startsWith("GET /api/timeseries/statistical_vector_data/"));
        expect(statsRequest).toBeDefined();
        expect(statsRequest).toContain(`case_uuid=${SYNTH.caseUuid}`);
        expect(statsRequest).toContain("vector_name=FOPR");
    });

    test("shows an error state when statistical data fails", async ({ page, mockApi }) => {
        mockApi.use(
            http.get(apiUrl("/timeseries/statistical_vector_data/"), () =>
                HttpResponse.json({ error: { type: "InternalError", message: "boom" } }, { status: 500 }),
            ),
        );

        await addSyntheticEnsembleAndModule(page);

        const moduleLayout = page.getByTestId("module-layout");
        await expect(moduleLayout.getByText("One or more queries have an error state")).toBeVisible();
        await expect(moduleLayout.locator(".scatterlayer .js-line")).toHaveCount(0);
    });
});

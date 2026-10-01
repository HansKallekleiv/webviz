import type { Page } from "@playwright/test";
import { http, HttpResponse } from "msw";

import { apiUrl } from "../../mocks/apiUrl";
import { SYNTH } from "../../mocks/syntheticField";
import { expect, test } from "../support/mockApi";
import { addModule, addSyntheticEnsemble, expandSettingsPanel } from "../support/mockedFlows";

const SIMULATION_TIME_SERIES = "Simulation Time Series";

async function addSyntheticEnsembleAndModule(page: Page): Promise<void> {
    await addSyntheticEnsemble(page);
    await addModule(page, SIMULATION_TIME_SERIES);
    await expandSettingsPanel(page);

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

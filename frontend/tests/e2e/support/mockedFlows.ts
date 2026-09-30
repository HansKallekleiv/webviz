import type { Page } from "@playwright/test";

import { SYNTH } from "../../mocks/syntheticField";

import { expect } from "./mockApi";
import { dragModuleOntoLayout } from "./walkthroughHelpers";

export async function addSyntheticEnsemble(page: Page): Promise<void> {
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
}

export async function addModule(page: Page, title: string): Promise<void> {
    const moduleListItem = page.locator(`[title="${title}"]`).first();
    if (!(await moduleListItem.isVisible())) {
        await page.getByTestId("modules-list-open-button").click();
    }
    await dragModuleOntoLayout(page, title);
}

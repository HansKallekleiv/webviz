import type { Page } from "@playwright/test";
import { http, HttpResponse } from "msw";

import { formatInplaceVolumesValue } from "@modules/_shared/InplaceVolumes/numberFormat";

import { apiUrl } from "../../mocks/apiUrl";
import { SYNTH, SYNTH_INPLACE, computeSynthInplaceStatisticalRows } from "../../mocks/syntheticField";
import { expect, test } from "../support/mockApi";
import type { MockApi } from "../support/mockApi";
import { addModule, addSyntheticEnsemble, expandSettingsPanel } from "../support/mockedFlows";

const INPLACE_VOLUMES_TABLE = "Inplace Volumes Table";
const STATISTICAL_PATH = "/api/inplace_volumes/get_aggregated_statistical_inplace_table_data/";

async function addInplaceVolumesTable(page: Page): Promise<void> {
    await addSyntheticEnsemble(page);
    await addModule(page, INPLACE_VOLUMES_TABLE);
    await expandSettingsPanel(page);
}

function lastRequestParams(mockApi: MockApi, path: string): URLSearchParams {
    const request = mockApi.handledRequests().findLast((r) => r.startsWith(`POST ${path}`));
    expect(request, `no handled POST ${path}`).toBeDefined();
    return new URL(request!.slice("POST ".length), "http://x").searchParams;
}

test.describe("Inplace Volumes Table (mocked API)", () => {
    test("shows statistics for the synthetic ensemble with default settings", async ({ page, mockApi }) => {
        await addInplaceVolumesTable(page);

        const moduleLayout = page.getByTestId("module-layout");
        await expect.poll(() => mockApi.handledRequests().some((r) => r.startsWith(`POST ${STATISTICAL_PATH}`))).toBe(true);

        const params = lastRequestParams(mockApi, STATISTICAL_PATH);
        expect(params.get("case_uuid")).toBe(SYNTH.caseUuid);
        expect(params.get("table_name")).toBe(SYNTH_INPLACE.tableName);
        const resultNames = params.getAll("result_names");
        expect(resultNames.length).toBeGreaterThan(0);

        const expectedRows = computeSynthInplaceStatisticalRows({
            resultName: resultNames[0],
            groupBy: params.getAll("group_by_indices"),
            realizations: [...SYNTH.realizations],
            filters: [],
        });
        expect(expectedRows.length).toBeGreaterThan(0);

        await expect(moduleLayout.getByRole("columnheader", { name: resultNames[0] }).first()).toBeVisible();
        for (const row of expectedRows) {
            const tableRow = moduleLayout
                .getByRole("row")
                .filter({ hasText: formatInplaceVolumesValue(row.statistics.mean) });
            await expect(tableRow.first()).toBeVisible();
            for (const groupValue of row.groupValues) {
                await expect(tableRow.filter({ hasText: groupValue }).first()).toBeVisible();
            }
        }
    });

    test("shows per-realization rows when the table type is changed", async ({ page, mockApi }) => {
        await addInplaceVolumesTable(page);

        await page.getByRole("combobox", { name: "Table type" }).click();
        await page.getByRole("option", { name: /per realization/i }).click();

        const moduleLayout = page.getByTestId("module-layout");
        await expect(moduleLayout.getByRole("columnheader", { name: "REAL" }).first()).toBeVisible();
        const perRealizationParams = lastRequestParams(
            mockApi,
            "/api/inplace_volumes/get_aggregated_per_realization_inplace_table_data/",
        );
        expect(perRealizationParams.get("realizations_encoded_as_uint_list_str")).toBeTruthy();
    });

    test("shows an error when inplace data cannot be loaded", async ({ page, mockApi }) => {
        mockApi.use(
            http.post(apiUrl("/inplace_volumes/get_aggregated_statistical_inplace_table_data/"), () =>
                HttpResponse.json({ error: { type: "InternalError", message: "boom" } }, { status: 500 }),
            ),
        );

        await addInplaceVolumesTable(page);

        await expect(page.getByText("Failed to load inplace volumes table data")).toBeVisible();
    });
});

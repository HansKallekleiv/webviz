import type { SettingSectionProps } from "@lib/components/Setting";

import type { SetupReadiness } from "../utils/setupReadiness";

export const NUMBER_INPUT_DEBOUNCE_MS = 500;

export enum SettingsSection {
    DATA_AND_VALUATION = "Data and valuation",
    PRICES = "Prices",
    COSTS = "Costs",
    RESULTS = "Results",
}

export type SectionStateProps = Required<Pick<SettingSectionProps, "title" | "open" | "onOpenChange">>;

export type SettingsSectionProps = {
    sectionProps: SectionStateProps;
    readiness: SetupReadiness;
};

import type { SettingSectionProps } from "@lib/components/Setting";

import type { SetupField, SetupReadiness } from "../utils/setupReadiness";

export const NUMBER_INPUT_DEBOUNCE_MS = 500;

export enum SettingsSection {
    DATA_AND_VALUATION = "Data and valuation",
    PRICES = "Prices",
    COSTS = "Costs",
    RESULTS = "Results",
}

export const FIELD_SECTIONS: Record<SetupField, SettingsSection> = {
    ensemble: SettingsSection.DATA_AND_VALUATION,
    predictionYear: SettingsSection.DATA_AND_VALUATION,
    oilPrice: SettingsSection.PRICES,
    gasPrice: SettingsSection.PRICES,
    injection: SettingsSection.PRICES,
    consumption: SettingsSection.PRICES,
    costs: SettingsSection.COSTS,
};

export type SectionStateProps = Required<Pick<SettingSectionProps, "title" | "open" | "onOpenChange">>;

export type SettingsSectionProps = {
    sectionProps: SectionStateProps;
    readiness: SetupReadiness;
};

/** Marks a field's content so the setup summary can focus it. */
export function setupFieldClassName(field: SetupField): string {
    return `setup-field-${field}`;
}

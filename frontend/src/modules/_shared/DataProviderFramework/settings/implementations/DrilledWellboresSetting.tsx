import React from "react";

import { Button } from "@lib/components/Button";
import type { SimplifiedWellboreHeader } from "@lib/utils/wellboreTypes";
import { WellboreSelectionDialog } from "@modules/_shared/components/WellboreSelectionDialog";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = SimplifiedWellboreHeader[] | null;

export class DrilledWellboresSetting implements CustomSettingImplementation<ValueType, SettingCategory.MULTI_SELECT> {
    defaultValue: ValueType = null;

    getLabel(): string {
        return "Drilled wellbores";
    }

    fixupValue(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.MULTI_SELECT>,
    ): ValueType {
        if (!currentValue) {
            return availableValues;
        }

        const matchingValues = currentValue.filter((value) =>
            availableValues.some((availableValue) => availableValue.wellboreUuid === value.wellboreUuid),
        );
        if (matchingValues.length === 0) {
            return availableValues;
        }
        return matchingValues;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) => React.ReactNode {
        return function DrilledWellbores(props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) {
            const [dialogOpen, setDialogOpen] = React.useState(false);
            // Available values are already simplified wellbore headers from the provider
            const availableValues = props.availableValues ?? [];
            const selectedValues = props.value ?? [];

            function handleSelectionChange(wellbores: SimplifiedWellboreHeader[]) {
                props.onValueChange(wellbores);
            }

            function handleDialogClose() {
                setDialogOpen(false);
            }

            function handleOpenDialog() {
                setDialogOpen(true);
            }

            const selectedCount = selectedValues.length;
            const totalCount = availableValues.length;

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Button
                        variant="outlined"
                        onClick={handleOpenDialog}
                        disabled={props.isOverridden}
                        style={{ width: "100%" }}
                    >
                        {selectedCount === 0
                            ? "Select wellbores..."
                            : `${selectedCount} of ${totalCount} wellbores selected`}
                    </Button>

                    <WellboreSelectionDialog
                        open={dialogOpen}
                        wellbores={availableValues}
                        selectedWellbores={selectedValues}
                        onSelectionChange={handleSelectionChange}
                        onClose={handleDialogClose}
                    />
                </div>
            );
        };
    }
}

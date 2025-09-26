import React from "react";

import { Button } from "../../../../../lib/components/Button";
import { DepthFilterDialog, type DepthFilterSettings } from "../../../../../lib/components/DepthFilterDialog";
import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = DepthFilterSettings | null;

export class DepthFilterSetting implements CustomSettingImplementation<ValueType, SettingCategory.STATIC> {
    defaultValue: ValueType = {};

    getLabel(): string {
        return "Depth Filter";
    }

    getIsStatic(): boolean {
        return true;
    }

    isValueValid(): boolean {
        return true; // Static settings are always valid
    }

    fixupValue(currentValue: ValueType): ValueType {
        // For static settings, just return the current value or default
        return currentValue ?? this.defaultValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value || {});
    }

    deserializeValue(serializedValue: string): ValueType {
        try {
            return JSON.parse(serializedValue);
        } catch {
            return this.defaultValue;
        }
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.STATIC>) => React.ReactNode {
        return function DepthFilter(props: SettingComponentProps<ValueType, SettingCategory.STATIC>) {
            const [dialogOpen, setDialogOpen] = React.useState(false);
            const currentSettings = props.value ?? {};

            function handleSettingsChange(settings: DepthFilterSettings) {
                props.onValueChange(settings);
            }

            function handleDialogClose() {
                setDialogOpen(false);
            }

            function handleOpenDialog() {
                setDialogOpen(true);
            }

            // Create a summary of active settings
            const getSettingsSummary = () => {
                const activeSetting = [];
                if (currentSettings.tvdCutoffAbove !== undefined) {
                    activeSetting.push(`Above: ${currentSettings.tvdCutoffAbove}m`);
                }
                if (currentSettings.tvdCutoffBelow !== undefined) {
                    activeSetting.push(`Below: ${currentSettings.tvdCutoffBelow}m`);
                }

                if (activeSetting.length === 0) {
                    return "Configure depth filter...";
                }

                return activeSetting.join(", ");
            };

            return (
                <div className="flex flex-col gap-1 mt-1">
                    <Button
                        variant="outlined"
                        onClick={handleOpenDialog}
                        disabled={props.isOverridden}
                        style={{ width: "100%" }}
                    >
                        {getSettingsSummary()}
                    </Button>

                    <DepthFilterDialog
                        open={dialogOpen}
                        settings={currentSettings}
                        onSettingsChange={handleSettingsChange}
                        onClose={handleDialogClose}
                    />
                </div>
            );
        };
    }
}

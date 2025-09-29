import React from "react";

import { useQuery } from "@tanstack/react-query";

import { SurfaceAttributeType_api, getRealizationSurfacesMetadataOptions } from "@api";

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

            // Get ensemble information from global settings to fetch surfaces
            const ensembles = props.globalSettings.ensembles;
            const fieldIdentifier = props.globalSettings.fieldId;

            // Get the first available ensemble for surface fetching
            // In a real implementation, this might come from a parent data provider's ensemble setting
            const availableEnsemble = ensembles.find((ensemble) => ensemble.getFieldIdentifier() === fieldIdentifier);

            // Fetch surface metadata if we have an ensemble
            const surfaceQuery = useQuery({
                ...getRealizationSurfacesMetadataOptions({
                    query: {
                        case_uuid: availableEnsemble?.getCaseUuid() || "",
                        ensemble_name: availableEnsemble?.getEnsembleName() || "",
                    },
                }),
                enabled: !!availableEnsemble,
            });

            // Filter surfaces by DEPTH attribute type only
            const depthSurfaces = React.useMemo(() => {
                return (
                    surfaceQuery.data?.surfaces.filter(
                        (surface) => surface.attribute_type === SurfaceAttributeType_api.DEPTH,
                    ) || []
                );
            }, [surfaceQuery.data?.surfaces]);

            // Get unique attribute names from depth surfaces
            const availableAttributes = [...new Set(depthSurfaces.map((surface) => surface.attribute_name))];

            // Get surface names for the selected attribute (reactive to currentSettings changes)
            const availableSurfaceNames = React.useMemo(() => {
                const selectedAttribute = currentSettings.selectedAttribute;
                return selectedAttribute
                    ? [
                          ...new Set(
                              depthSurfaces
                                  .filter((surface) => surface.attribute_name === selectedAttribute)
                                  .map((surface) => surface.name),
                          ),
                      ]
                    : [];
            }, [depthSurfaces, currentSettings.selectedAttribute]);

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

                if (currentSettings.filterType === "tvd") {
                    if (currentSettings.tvdCutoffAbove !== undefined) {
                        activeSetting.push(`Above: ${currentSettings.tvdCutoffAbove}m`);
                    }
                    if (currentSettings.tvdCutoffBelow !== undefined) {
                        activeSetting.push(`Below: ${currentSettings.tvdCutoffBelow}m`);
                    }
                } else if (currentSettings.filterType === "surface") {
                    if (currentSettings.selectedAttribute) {
                        activeSetting.push(`Attribute: ${currentSettings.selectedAttribute}`);
                    }
                    if (currentSettings.selectedSurface) {
                        activeSetting.push(`Surface: ${currentSettings.selectedSurface}`);
                    }
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
                        availableAttributes={availableAttributes}
                        availableSurfaceNames={availableSurfaceNames}
                    />
                </div>
            );
        };
    }
}

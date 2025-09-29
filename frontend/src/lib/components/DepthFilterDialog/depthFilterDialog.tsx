import React from "react";

import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { Dropdown } from "../Dropdown";
import { Input } from "../Input";

export interface DepthFilterSettings {
    filterType?: "tvd" | "surface"; // Exclusive filter type
    // TVD Filter settings
    tvdCutoffAbove?: number;
    tvdCutoffBelow?: number;
    // Surface Filter settings
    selectedAttribute?: string; // Surface attribute name
    selectedSurface?: string; // Surface name
    // Future settings can be added here:
    // useReservoirSection?: boolean;
    // reservoirSectionSettings?: ReservoirSectionSettings;
}

export interface DepthFilterDialogProps {
    open: boolean;
    settings: DepthFilterSettings;
    onSettingsChange: (settings: DepthFilterSettings) => void;
    onClose: () => void;
    availableAttributes?: string[];
    availableSurfaceNames?: string[];
}

export function DepthFilterDialog(props: DepthFilterDialogProps): React.ReactNode {
    const [localSettings, setLocalSettings] = React.useState<DepthFilterSettings>(props.settings);

    // Reset local settings when dialog opens with new settings
    React.useEffect(() => {
        if (props.open) {
            setLocalSettings(props.settings);
        }
    }, [props.open, props.settings]);

    // Auto-select first surface when available surface names change and current selection is invalid
    React.useEffect(() => {
        if (
            localSettings.filterType === "surface" &&
            localSettings.selectedAttribute &&
            props.availableSurfaceNames &&
            props.availableSurfaceNames.length > 0
        ) {
            // If current surface is not in the available list, select the first one
            if (
                !localSettings.selectedSurface ||
                !props.availableSurfaceNames.includes(localSettings.selectedSurface)
            ) {
                setLocalSettings((prev) => ({
                    ...prev,
                    selectedSurface: props.availableSurfaceNames![0],
                }));
            }
        }
    }, [
        props.availableSurfaceNames,
        localSettings.selectedAttribute,
        localSettings.filterType,
        localSettings.selectedSurface,
    ]);

    const handleApply = () => {
        props.onSettingsChange(localSettings);
        props.onClose();
    };

    const handleCancel = () => {
        setLocalSettings(props.settings); // Reset to original
        props.onClose();
    };

    const handleTvdCutoffAboveChange = (value: string) => {
        const numValue = parseFloat(value);
        setLocalSettings((prev) => ({
            ...prev,
            tvdCutoffAbove: isNaN(numValue) ? undefined : numValue,
        }));
    };

    const handleTvdCutoffBelowChange = (value: string) => {
        const numValue = parseFloat(value);
        setLocalSettings((prev) => ({
            ...prev,
            tvdCutoffBelow: isNaN(numValue) ? undefined : numValue,
        }));
    };

    const handleFilterTypeChange = (filterType: "tvd" | "surface") => {
        setLocalSettings((prev) => ({
            // Reset all settings when changing filter type
            filterType,
            // Keep only relevant settings based on filter type
            ...(filterType === "tvd"
                ? {
                      tvdCutoffAbove: prev.tvdCutoffAbove,
                      tvdCutoffBelow: prev.tvdCutoffBelow,
                      selectedAttribute: undefined,
                      selectedSurface: undefined,
                  }
                : {
                      tvdCutoffAbove: undefined,
                      tvdCutoffBelow: undefined,
                      selectedAttribute: prev.selectedAttribute,
                      selectedSurface: prev.selectedSurface,
                  }),
        }));
    };

    const handleAttributeSelectionChange = (attributeName: string | null) => {
        setLocalSettings((prev) => ({
            ...prev,
            selectedAttribute: attributeName || undefined,
            // Don't reset surface selection here - let useEffect handle auto-selection
        }));
    };

    const handleSurfaceSelectionChange = (surfaceName: string | null) => {
        setLocalSettings((prev) => ({
            ...prev,
            selectedSurface: surfaceName || undefined,
        }));
    };

    const dialogActions = (
        <div className="flex gap-2 justify-end">
            <Button variant="outlined" onClick={handleCancel}>
                Cancel
            </Button>
            <Button variant="contained" onClick={handleApply}>
                Apply Settings
            </Button>
        </div>
    );

    return (
        <Dialog
            open={props.open}
            onClose={handleCancel}
            title="Depth Filter Settings"
            width="500px"
            height="600px"
            showCloseCross
            actions={dialogActions}
        >
            <div className="flex flex-col gap-4 p-4 max-h-full overflow-y-auto">
                {/* Filter Type Selection */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">Filter Type</h3>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="radio"
                                id="tvdFilter"
                                name="filterType"
                                value="tvd"
                                checked={localSettings.filterType === "tvd"}
                                onChange={() => handleFilterTypeChange("tvd")}
                                className="h-4 w-4 text-blue-600"
                            />
                            <label htmlFor="tvdFilter" className="text-sm text-gray-700">
                                True Vertical Depth (TVD) Cutoffs
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="radio"
                                id="surfaceFilter"
                                name="filterType"
                                value="surface"
                                checked={localSettings.filterType === "surface"}
                                onChange={() => handleFilterTypeChange("surface")}
                                className="h-4 w-4 text-blue-600"
                            />
                            <label htmlFor="surfaceFilter" className="text-sm text-gray-700">
                                Surface Intersection Filter
                            </label>
                        </div>
                    </div>
                </div>

                {/* TVD Cutoff Settings - Only show if TVD filter is selected */}
                {localSettings.filterType === "tvd" && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">
                            TVD Cutoff Settings
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            {/* TVD Cutoff Above */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">Above (meters)</label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 1000"
                                    value={localSettings.tvdCutoffAbove?.toString() || ""}
                                    onChange={(e) => handleTvdCutoffAboveChange(e.target.value)}
                                    className="w-full text-sm"
                                />
                            </div>

                            {/* TVD Cutoff Below */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">Below (meters)</label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 3000"
                                    value={localSettings.tvdCutoffBelow?.toString() || ""}
                                    onChange={(e) => handleTvdCutoffBelowChange(e.target.value)}
                                    className="w-full text-sm"
                                />
                            </div>
                        </div>

                        <p className="text-xs text-gray-500">
                            Set depth limits to filter trajectories. Leave empty for no cutoff.
                        </p>
                    </div>
                )}

                {/* Surface Intersection Filter - Only show if Surface filter is selected */}
                {localSettings.filterType === "surface" && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">
                            Surface Intersection Settings
                        </h3>

                        <div className="space-y-3">
                            {/* Attribute Selection */}
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-700">Surface Attribute</label>
                                <Dropdown
                                    options={
                                        props.availableAttributes?.map((attribute) => ({
                                            value: attribute,
                                            label: attribute,
                                        })) || []
                                    }
                                    value={localSettings.selectedAttribute || null}
                                    onChange={(value) => handleAttributeSelectionChange(value)}
                                    placeholder="Choose attribute..."
                                    className="w-full text-sm"
                                />
                            </div>

                            {/* Surface Name Selection - Only show if attribute is selected */}
                            {localSettings.selectedAttribute && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-medium text-gray-700">Surface Name</label>
                                    <Dropdown
                                        options={
                                            props.availableSurfaceNames?.map((surface) => ({
                                                value: surface,
                                                label: surface,
                                            })) || []
                                        }
                                        value={localSettings.selectedSurface || null}
                                        onChange={(value) => handleSurfaceSelectionChange(value)}
                                        placeholder="Select surface..."
                                        className="w-full text-sm"
                                    />
                                </div>
                            )}

                            <p className="text-xs text-gray-500">
                                Trajectories will be cut off above the intersection with the selected surface.
                            </p>
                        </div>
                    </div>
                )}

                {/* Future Reservoir Section Settings */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">
                        Reservoir Section Filter
                    </h3>
                    <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500 italic">
                            Additional filtering options will be available here in a future update...
                        </p>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

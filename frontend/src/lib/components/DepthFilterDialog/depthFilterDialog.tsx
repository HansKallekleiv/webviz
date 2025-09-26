import React from "react";

import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { Input } from "../Input";

export interface DepthFilterSettings {
    tvdCutoffAbove?: number;
    tvdCutoffBelow?: number;
    // Future settings can be added here:
    // useReservoirSection?: boolean;
    // reservoirSectionSettings?: ReservoirSectionSettings;
}

export interface DepthFilterDialogProps {
    open: boolean;
    settings: DepthFilterSettings;
    onSettingsChange: (settings: DepthFilterSettings) => void;
    onClose: () => void;
}

export function DepthFilterDialog(props: DepthFilterDialogProps): React.ReactNode {
    const [localSettings, setLocalSettings] = React.useState<DepthFilterSettings>(props.settings);

    // Reset local settings when dialog opens with new settings
    React.useEffect(() => {
        if (props.open) {
            setLocalSettings(props.settings);
        }
    }, [props.open, props.settings]);

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
            height="450px"
            showCloseCross
            actions={dialogActions}
        >
            <div className="flex flex-col gap-6 p-4">
                {/* TVD Cutoff Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900">True Vertical Depth (TVD) Cutoffs</h3>

                    {/* TVD Cutoff Above */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">TVD Cutoff Above (meters)</label>
                        <div className="space-y-1">
                            <Input
                                type="number"
                                placeholder="Enter depth cutoff above..."
                                value={localSettings.tvdCutoffAbove?.toString() || ""}
                                onChange={(e) => handleTvdCutoffAboveChange(e.target.value)}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500">
                                Trajectories will be cut off above this TVD. Leave empty for no cutoff above.
                            </p>
                        </div>
                    </div>

                    {/* TVD Cutoff Below */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">TVD Cutoff Below (meters)</label>
                        <div className="space-y-1">
                            <Input
                                type="number"
                                placeholder="Enter depth cutoff below..."
                                value={localSettings.tvdCutoffBelow?.toString() || ""}
                                onChange={(e) => handleTvdCutoffBelowChange(e.target.value)}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500">
                                Trajectories will be cut off below this TVD. Leave empty for no cutoff below.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Future Reservoir Section Settings */}
                <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Reservoir Section Filter</h3>
                    <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500 italic">
                            Options to filter wells by reservoir section will be added here in a future update...
                        </p>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

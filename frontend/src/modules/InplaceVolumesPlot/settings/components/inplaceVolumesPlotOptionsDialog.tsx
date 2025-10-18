import type React from "react";
import { useRef } from "react";

import { Checkbox } from "@lib/components/Checkbox";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { createPortal } from "@lib/utils/createPortal";
import { Close } from "@mui/icons-material";
import { ClickAwayListener } from "@mui/material";

export enum HistogramType {
    Stack = "stack",
    Group = "group",
    Overlay = "overlay",
    Relative = "relative",
}

export enum BarSortBy {
    Xvalues = "xvalues",
    Yvalues = "yvalues",
}

export type InplaceVolumesPlotOptions = {
    histogramType: HistogramType; // For histogram plots
    barSortBy: BarSortBy; // How to sort the bars in a bar plot,
    showStatisticalMarkers: boolean;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    showLegend: boolean;
};
export type InplaceVolumesPlotOptionsDialogProps = {
    options: InplaceVolumesPlotOptions;
    isOpen: boolean;
    onClose: () => void;
    onChange: (options: InplaceVolumesPlotOptions) => void;
    anchorElement?: HTMLElement | null;
};

export function InplaceVolumesPlotOptionsDialog({
    isOpen,
    onClose,
    anchorElement,
    options,
    onChange,
}: InplaceVolumesPlotOptionsDialogProps): React.ReactElement | null {
    const dialogRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    // Shared onChange handler for options
    const handleOptionChange = <K extends keyof InplaceVolumesPlotOptions>(
        key: K,
        value: InplaceVolumesPlotOptions[K],
    ) => {
        onChange({
            ...options,
            [key]: value,
        });
    };

    // Individual handlers
    const handleBarmodeChange = (value: string | number) => {
        handleOptionChange("histogramType", value as HistogramType);
    };

    const handleBarSortByChange = (value: string | number) => {
        handleOptionChange("barSortBy", value as BarSortBy);
    };

    const handleSharedXAxisChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("sharedXAxis", checked);
    };

    const handleSharedYAxisChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("sharedYAxis", checked);
    };

    const handleShowLegendChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showLegend", checked);
    };
    const handleShowStatisticalMarkersChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showStatisticalMarkers", checked);
    };

    // Calculate position relative to anchor element
    const baseStyle: React.CSSProperties = {
        position: "fixed",
        zIndex: 40,
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        minWidth: "320px",
        maxWidth: "400px",
        overflow: "visible",
    };

    // Position relative to anchor element
    const rect = anchorElement?.getBoundingClientRect();
    const style: React.CSSProperties = {
        ...baseStyle,
        top: rect ? rect.bottom + 4 : 100,
        left: rect ? rect.left : 100,
    };

    const dialogContent = (
        <ClickAwayListener onClickAway={onClose}>
            <div ref={dialogRef} style={style}>
                {" "}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Plot options</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        title="Close"
                    >
                        <Close fontSize="small" />
                    </button>
                </div>
                <div className="p-4 flex flex-col gap-3">
                    <Label position="left" text="Histogram Type">
                        <Dropdown
                            options={[
                                { label: "Stacked", value: HistogramType.Stack },
                                { label: "Grouped", value: HistogramType.Group },
                                { label: "Overlayed", value: HistogramType.Overlay },
                                { label: "Relative", value: HistogramType.Relative },
                            ]}
                            value={options.histogramType}
                            onChange={handleBarmodeChange}
                        />
                    </Label>
                    <Label position="left" text="Bar Sort By">
                        <Dropdown
                            options={[
                                { label: "X Values", value: BarSortBy.Xvalues },
                                { label: "Y Values", value: BarSortBy.Yvalues },
                            ]}
                            value={options.barSortBy}
                            onChange={handleBarSortByChange}
                        />
                    </Label>
                    <Label position="left" text="Show statistical markers">
                        <Checkbox
                            checked={options.showStatisticalMarkers}
                            onChange={handleShowStatisticalMarkersChange}
                        />
                    </Label>
                    <Label position="left" text="Shared X Axis">
                        <Checkbox checked={options.sharedXAxis} onChange={handleSharedXAxisChange} />
                    </Label>
                    <Label position="left" text="Shared Y Axis">
                        <Checkbox checked={options.sharedYAxis} onChange={handleSharedYAxisChange} />
                    </Label>
                    <Label position="left" text="Show Legend">
                        <Checkbox checked={options.showLegend} onChange={handleShowLegendChange} />
                    </Label>
                </div>
            </div>
        </ClickAwayListener>
    );

    return createPortal(dialogContent);
}

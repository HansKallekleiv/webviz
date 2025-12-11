import type React from "react";

import type { PlotBuilder } from "../utils/PlotBuilder";

interface PlotSectionProps {
    plotBuilder: PlotBuilder;
    height: number;
    width: number;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
}

export function PlotSection({
    plotBuilder,
    height,
    width,
    sharedXAxis,
    sharedYAxis,
}: PlotSectionProps): React.ReactNode {
    const horizontalSpacing = 80 / width;
    const verticalSpacing = 60 / height;

    return (
        <div style={{ height }}>
            {plotBuilder.buildPlot(height, width, {
                horizontalSpacing,
                verticalSpacing,
                showGrid: true,
                sharedXAxes: sharedXAxis,
                sharedYAxes: sharedYAxis,
                margin: { t: 20, b: 50, l: 50, r: 20 },
            })}
        </div>
    );
}

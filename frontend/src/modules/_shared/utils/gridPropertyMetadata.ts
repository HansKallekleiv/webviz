import type { Grid3dInfo_api, Grid3dPropertyInfo_api } from "@api";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import type { ColorScaleMarkerLabel } from "./ColorScaleWithName";

export type SelectedGridPropertyInfoStoredData = {
    selectedGridPropertyInfo: Grid3dPropertyInfo_api | null;
};

export function findSelectedGridPropertyInfo(
    gridModelInfoArr: Grid3dInfo_api[] | null | undefined,
    gridName: string | null,
    propertyName: string | null,
    timeOrInterval: string | null,
): Grid3dPropertyInfo_api | null {
    if (!gridModelInfoArr || !gridName || !propertyName) {
        return null;
    }

    const normalizedTimeOrInterval = normalizeTimeOrInterval(timeOrInterval);
    const gridModelInfo = gridModelInfoArr.find((gridModel) => gridModel.grid_name === gridName);

    return (
        gridModelInfo?.property_info_arr.find(
            (propertyInfo) =>
                propertyInfo.property_name === propertyName &&
                normalizeTimeOrInterval(propertyInfo.iso_date_or_interval ?? null) === normalizedTimeOrInterval,
        ) ?? null
    );
}

export function makeGridPropertyColorScale(
    colorScale: ColorScale,
    selectedGridPropertyInfo: Grid3dPropertyInfo_api | null,
): ColorScale {
    if (!selectedGridPropertyInfo?.is_discrete) {
        return colorScale.clone();
    }

    const adjustedColorScale = new ColorScale({
        type: ColorScaleType.Discrete,
        colorPalette: colorScale.getColorPalette(),
        gradientType: colorScale.getGradientType(),
        steps: Math.max(selectedGridPropertyInfo.codenames?.length ?? 0, 1),
    });

    if (colorScale.getGradientType() === ColorScaleGradientType.Diverging) {
        adjustedColorScale.setRangeAndMidPoint(colorScale.getMin(), colorScale.getMax(), colorScale.getDivMidPoint());
    } else {
        adjustedColorScale.setRange(colorScale.getMin(), colorScale.getMax());
    }

    return adjustedColorScale;
}

export function makeGridPropertyMarkerLabels(
    selectedGridPropertyInfo: Grid3dPropertyInfo_api | null,
): ColorScaleMarkerLabel[] | null {
    if (!selectedGridPropertyInfo?.is_discrete || !selectedGridPropertyInfo.codenames?.length) {
        return null;
    }

    return selectedGridPropertyInfo.codenames
        .slice()
        .sort((left, right) => left.code - right.code)
        .map((codename) => ({
            value: codename.code,
            label: codename.name,
        }));
}

function normalizeTimeOrInterval(timeOrInterval: string | null): string | null {
    if (timeOrInterval === "NO_TIME") {
        return null;
    }

    return timeOrInterval;
}
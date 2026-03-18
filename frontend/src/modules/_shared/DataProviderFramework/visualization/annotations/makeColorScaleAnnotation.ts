import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    Annotation,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import {
    makeGridPropertyColorScale,
    makeGridPropertyMarkerLabels,
    type SelectedGridPropertyInfoStoredData,
} from "@modules/_shared/utils/gridPropertyMetadata";

function makeAnnotation(id: string, name: string, colorScale: ColorScaleWithName): Annotation[] {
    return [{ id, colorScale }];
}

export function makeColorScaleAnnotation({
    getSetting,
    getDataValueRange,
    id,
    name,
    isLoading,
}: TransformerArgs<[Setting.COLOR_SCALE], any>): Annotation[] {
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;
    const useCustomColorScaleBoundaries = getSetting(Setting.COLOR_SCALE)?.areBoundariesUserDefined ?? false;
    const valueRange = getDataValueRange();

    if (!colorScale || !valueRange || isLoading) {
        return [];
    }

    // Adjust color scale boundaries
    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const [min, max] = valueRange;
        const mid = min + (max - min) / 2;
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    return makeAnnotation(id, name, ColorScaleWithName.fromColorScale(adjustedColorScale, name));
}

export function makeRealizationGridColorScaleAnnotation<TStoredData extends SelectedGridPropertyInfoStoredData>({
    getSetting,
    getStoredData,
    getDataValueRange,
    id,
    name,
    isLoading,
}: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, TStoredData>): Annotation[] {
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;
    const useCustomColorScaleBoundaries = getSetting(Setting.COLOR_SCALE)?.areBoundariesUserDefined ?? false;
    const valueRange = getDataValueRange();
    const attribute = getSetting(Setting.ATTRIBUTE) ?? name;
    const selectedGridPropertyInfo = getStoredData("selectedGridPropertyInfo");

    if (!colorScale || !valueRange || isLoading) {
        return [];
    }

    const adjustedColorScale = makeGridPropertyColorScale(colorScale, selectedGridPropertyInfo);
    if (!useCustomColorScaleBoundaries) {
        const [min, max] = valueRange;
        const mid = min + (max - min) / 2;
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    const namedColorScale = ColorScaleWithName.fromColorScale(adjustedColorScale, attribute);
    namedColorScale.setMarkerLabels(makeGridPropertyMarkerLabels(selectedGridPropertyInfo));

    return makeAnnotation(id, attribute, namedColorScale);
}

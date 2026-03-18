import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    Annotation,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import type { IntersectionRealizationGridStoredData } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { makeGridPropertyColorScale, makeGridPropertyMarkerLabels } from "@modules/_shared/utils/gridPropertyMetadata";

import { createGridColorScaleValues, createSeismicColorScaleValues } from "../utils/colorScaleUtils";

function makeColorScaleAnnotation({
    getSetting,
    getDataValueRange,
    id,
    isLoading,
    createColorScaleValues,
}: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, any, any> & {
    createColorScaleValues: (valueRange: readonly [number, number]) => { min: number; max: number; mid: number };
}): Annotation[] {
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;
    const useCustomColorScaleBoundaries = getSetting(Setting.COLOR_SCALE)?.areBoundariesUserDefined ?? false;
    const valueRange = getDataValueRange();
    const attribute = getSetting(Setting.ATTRIBUTE);

    if (!colorScale || !valueRange || !attribute || isLoading) {
        return [];
    }

    // Adjust color scale boundaries
    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const { min, max, mid } = createColorScaleValues(valueRange);
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    return [{ id, colorScale: ColorScaleWithName.fromColorScale(adjustedColorScale, attribute) }];
}

export function makeGridColorScaleAnnotation(
    args: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, IntersectionRealizationGridStoredData, any>,
): Annotation[] {
    const colorScale = args.getSetting(Setting.COLOR_SCALE)?.colorScale;
    const useCustomColorScaleBoundaries = args.getSetting(Setting.COLOR_SCALE)?.areBoundariesUserDefined ?? false;
    const valueRange = args.getDataValueRange();
    const attribute = args.getSetting(Setting.ATTRIBUTE);
    const selectedGridPropertyInfo = args.getStoredData("selectedGridPropertyInfo");

    if (!colorScale || !valueRange || !attribute || args.isLoading) {
        return [];
    }

    const adjustedColorScale = makeGridPropertyColorScale(colorScale, selectedGridPropertyInfo);
    if (!useCustomColorScaleBoundaries) {
        const { min, max, mid } = createGridColorScaleValues(valueRange);
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    const namedColorScale = ColorScaleWithName.fromColorScale(adjustedColorScale, attribute);
    namedColorScale.setMarkerLabels(makeGridPropertyMarkerLabels(selectedGridPropertyInfo));

    return [{ id: args.id, colorScale: namedColorScale }];
}

export function makeSeismicColorScaleAnnotation(
    args: TransformerArgs<[Setting.COLOR_SCALE, Setting.ATTRIBUTE], any, any, any>,
): Annotation[] {
    return makeColorScaleAnnotation({
        ...args,
        createColorScaleValues: createSeismicColorScaleValues,
    });
}

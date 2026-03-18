import type { ColorScaleOptions } from "@lib/utils/ColorScale";
import { ColorScale, ColorScaleGradientType } from "@lib/utils/ColorScale";

export type ColorScaleMarkerLabel = {
    value: number;
    label: string;
};

export class ColorScaleWithName extends ColorScale {
    private _name: string;
    private _markerLabels: ColorScaleMarkerLabel[] | null;

    constructor(options: ColorScaleOptions & { name: string; markerLabels?: ColorScaleMarkerLabel[] | null }) {
        super(options);
        this._name = options.name;
        this._markerLabels = options.markerLabels ? options.markerLabels.map((label) => ({ ...label })) : null;
    }

    setName(name: string) {
        this._name = name;
    }

    getName() {
        return this._name;
    }

    setMarkerLabels(markerLabels: ColorScaleMarkerLabel[] | null) {
        this._markerLabels = markerLabels ? markerLabels.map((label) => ({ ...label })) : null;
    }

    getMarkerLabels(): ColorScaleMarkerLabel[] | null {
        return this._markerLabels ? this._markerLabels.map((label) => ({ ...label })) : null;
    }

    static fromColorScale(colorScale: ColorScale, name: string): ColorScaleWithName {
        const newColorScale = new ColorScaleWithName({
            type: colorScale.getType(),
            colorPalette: colorScale.getColorPalette(),
            gradientType: colorScale.getGradientType(),
            steps: colorScale.getNumSteps(),
            name,
            markerLabels: colorScale instanceof ColorScaleWithName ? colorScale.getMarkerLabels() : null,
        });

        if (colorScale.getGradientType() === ColorScaleGradientType.Diverging) {
            newColorScale.setRangeAndMidPoint(colorScale.getMin(), colorScale.getMax(), colorScale.getDivMidPoint());
        } else {
            newColorScale.setRange(colorScale.getMin(), colorScale.getMax());
        }

        return newColorScale;
    }

    override clone(): ColorScaleWithName {
        const newColorScale = new ColorScaleWithName({
            type: this.getType(),
            colorPalette: this.getColorPalette(),
            gradientType: this.getGradientType(),
            steps: this.getNumSteps(),
            name: this._name,
            markerLabels: this._markerLabels,
        });

        if (this.getGradientType() === ColorScaleGradientType.Diverging) {
            newColorScale.setRangeAndMidPoint(this.getMin(), this.getMax(), this.getDivMidPoint());
        } else {
            newColorScale.setRange(this.getMin(), this.getMax());
        }

        return newColorScale;
    }
}

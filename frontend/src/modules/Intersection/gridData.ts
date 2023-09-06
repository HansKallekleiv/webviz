// Modified from https://github.com/equinor/esv-intersection/blob/master/src/datautils/seismicimage.ts
import { SeismicCanvasDataOptions, findIndexOfSample } from "@equinor/esv-intersection";
import { clamp } from "@equinor/videx-math";

import { color } from "d3-color";
import { scaleLinear } from "d3-scale";

export function createColorTable(colorMap: string[], size: number): [number, number, number][] {
    const colorDomain = colorMap.map((_v, i) => (i * size) / colorMap.length);
    const colorScale = scaleLinear<string>().domain(colorDomain).range(colorMap);

    const table = Array.from(new Array(size).keys()).map<[number, number, number]>((i) => {
        const rgb = color(colorScale(i))?.rgb();
        return rgb != null ? [rgb.r, rgb.g, rgb.b] : [0, 0, 0];
    });

    return table;
}

export type SeismicInfo = {
    minX: number;
    maxX: number;
    minTvdMsl: number;
    maxTvdMsl: number;
    domain: {
        min: number;
        max: number;
        difference: number;
    };
};

export const getSeismicOptions = (info: SeismicInfo | null): SeismicCanvasDataOptions => {
    if (!info) {
        return {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        };
    }
    return {
        x: info.minX,
        y: info.minTvdMsl,
        width: info.maxX - info.minX,
        height: info.maxTvdMsl - info.minTvdMsl,
    };
};

/**
 * Get key information about the seismic data
 * Code originally developed for the REP project
 * @param data Seismic data
 * @param trajectory Wellbore or freehand trajectory
 * @return  Key domain and depth information for seismic data
 */
export function getSeismicInfo(
    data: { datapoints: number[][]; yAxisValues: number[] },
    trajectory: number[][]
): SeismicInfo | null {
    if (!(data && data.datapoints)) {
        return null;
    }
    const minX = trajectory.reduce((acc: number, val: number[]) => Math.min(acc, val[0]!), 0);
    const maxX = trajectory.reduce((acc: number, val: number[]) => Math.max(acc, val[0]!), 0);

    const minTvdMsl = data.yAxisValues && data.yAxisValues[0]!;
    const maxTvdMsl = data.yAxisValues && data.yAxisValues[data.yAxisValues.length - 1]!;

    // Find value domain
    const dp = data.datapoints || [];
    const min = -dp.reduce((val: number, array: number[]) => Math.min(...array, val), 0);
    const max = dp.reduce((val: number, array: number[]) => Math.max(...array, val), 0);

    const absMax = Math.max(Math.abs(min), Math.abs(max));

    const dmin = -absMax;
    const dmax = absMax;

    const info = {
        minX,
        maxX,
        minTvdMsl,
        maxTvdMsl,
        domain: {
            min: dmin,
            max: dmax,
            difference: dmax - dmin,
        },
    };

    return info;
}

/**
 * Generate seismic
 * Code originally developed for the REP project
 * @param data Seismic data
 * @param trajectory Wellbore or freehand trajectory
 * @param colormap Color map for rendering
 * @param options.isLeftToRight (optional) draw left to right
 * @param options.seismicRange (optional) Range for mapping seimic values to color map
 * @param options.seismicMin (optional) Min seismic value for mapping seimic values to color map
 * @param options.seismicMax (optional) Max seismic value for mapping seimic values to color map
 * @return  Key domain and depth information for seismic data
 */
export async function generateGridSliceImage(
    data: { datapoints: number[][]; yAxisValues: number[] },
    trajectory: number[][],
    colormap: string[],
    options: {
        isLeftToRight: boolean;
        seismicRange?: number;
        seismicMin?: number;
        seismicMax?: number;
    } = { isLeftToRight: true }
): Promise<ImageBitmap | undefined> {
    if (!(data && data.datapoints && data.datapoints.length > 0)) {
        return undefined;
    }
    const { datapoints: dp } = data;

    const min =
        options?.seismicMin ||
        options?.seismicRange ||
        dp.reduce((val: number, array: number[]) => Math.min(...array, val), 0);
    const max =
        options?.seismicMax ||
        options?.seismicRange ||
        dp.reduce((val: number, array: number[]) => Math.max(...array, val), 0);

    // const absMax = Math.max(Math.abs(min), Math.abs(max));

    // const dmin = -absMax;
    // const dmax = absMax;

    const domain = {
        min: min,
        max: max,
        difference: max - min,
    };

    const length = trajectory[0]?.[0]! - trajectory[trajectory.length - 1]?.[0]!;
    const width = Math.abs(Math.floor(length / 5));
    const height = data.yAxisValues.length;

    // Generate color table
    const colorTableSize = 1000;
    const colorTable = createColorTable(colormap, colorTableSize);

    // Generate image
    const d = new Uint8ClampedArray(width * height * 4);

    let offset = 0;
    const colorFactor = (colorTableSize - 1) / domain.difference;

    let pos = options?.isLeftToRight ? trajectory[0]?.[0]! : trajectory[trajectory.length - 1]?.[0]!;

    const step = (length / width) * (options?.isLeftToRight ? -1 : 1);

    let val1: number;
    let val2: number;
    let val: number;
    let i: number;
    let col: number[];
    const black = [0, 0, 0];
    let opacity: number;

    for (let x = 0; x < width; x++) {
        offset = x * 4;
        const index = findIndexOfSample(trajectory, pos);
        const x1 = trajectory[index]?.[0]!;
        const x2 = trajectory[index + 1]?.[0]!;
        const span = x2 - x1;
        const dx = pos - x1;
        const ratio = dx / span;

        for (let y = 0; y < height; y++) {
            val1 = dp[y]?.[index]!;
            val2 = dp[y]?.[index + 1]!;
            if (val1 == null || val2 == null) {
                col = black;
                opacity = 0;
            } else {
                val = val1 * (1 - ratio) + val2 * ratio;
                i = (val - domain.min) * colorFactor;
                i = clamp(~~i, 0, colorTableSize - 1);
                col = colorTable[i]!;
                opacity = 255;
            }

            d.set([col[0]!, col[1]!, col[2]!, opacity], offset);

            offset += width * 4;
        }
        pos += step;
    }
    const imageData = new ImageData(d, width, height);
    const image = await createImageBitmap(imageData, 0, 0, width, height);

    return image;
}

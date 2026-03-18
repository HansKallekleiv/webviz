import React from "react";

import type { ColorScale } from "@lib/utils/ColorScale";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import type { ColorScaleMarkerLabel, ColorScaleWithName } from "@modules_shared/utils/ColorScaleWithName";

import type { ColorScaleWithId } from "./colorScaleWithId";

const STYLE_CONSTANTS = {
    lineWidth: 6,
    lineColor: "#555",
    textGap: 6,
    offset: 10,
    legendGap: 4,
    textWidth: 110,
    nameLabelWidth: 10,
    fontSize: 10,
};

const TEXT_STYLE: React.CSSProperties = {
    fontSize: "11px",
    stroke: "#fff",
    paintOrder: "stroke",
    strokeWidth: "5px",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fontWeight: 800,
    overflow: "hidden",
};

function makeMarkerElements(key: string, left: number, y: number, label: string): React.ReactNode[] {
    return [
        <line
            key={`${key}-marker`}
            x1={left}
            y1={y + 1}
            x2={left + STYLE_CONSTANTS.lineWidth}
            y2={y + 1}
            stroke={STYLE_CONSTANTS.lineColor}
            strokeWidth="1"
        />,
        <text
            key={`${key}-text`}
            x={left + STYLE_CONSTANTS.lineWidth + STYLE_CONSTANTS.textGap}
            y={y + 4}
            fontSize="10"
            style={TEXT_STYLE}
        >
            {label}
        </text>,
    ];
}

function calcNormalizedValue(colorScale: ColorScale, value: number): number {
    const min = colorScale.getMin();
    const max = colorScale.getMax();

    if (colorScale.getGradientType() === ColorScaleGradientType.Sequential) {
        if (max === min) {
            return 1;
        }

        return (value - min) / (max - min);
    }

    if (max === min) {
        return 0.5;
    }

    const divMidPoint = colorScale.getDivMidPoint();
    if (value < divMidPoint) {
        if (divMidPoint === min) {
            return 0.5;
        }

        return ((value - min) / (divMidPoint - min)) * 0.5;
    }

    if (divMidPoint === max) {
        return 0.5;
    }

    return 0.5 * (1 + (value - divMidPoint) / (max - divMidPoint));
}

function makeMarkers(
    colorScale: ColorScale,
    barTop: number,
    sectionTop: number,
    sectionBottom: number,
    left: number,
    barHeight: number,
): React.ReactNode[] {
    const sectionHeight = Math.abs(sectionBottom - sectionTop);

    const minMarkerHeight = STYLE_CONSTANTS.fontSize + 4 * STYLE_CONSTANTS.textGap;
    const maxNumMarkers = Math.floor(sectionHeight / minMarkerHeight);

    // Odd number of markers makes sure the midpoint in each section is shown which is preferable
    const numMarkers = maxNumMarkers % 2 === 0 ? maxNumMarkers - 1 : maxNumMarkers;
    const markerDistance = sectionHeight / (numMarkers + 1);

    const markers: React.ReactNode[] = [];

    let currentLocalY = sectionTop - barTop + markerDistance;
    for (let i = 0; i < numMarkers; i++) {
        const relValue = 1 - currentLocalY / barHeight;
        const value = colorScale.getMin() + (colorScale.getMax() - colorScale.getMin()) * relValue;

        const globalY = barTop + currentLocalY;

        markers.push(...makeMarkerElements(`${sectionTop}-${i}`, left, globalY, formatNumber(value)));

        currentLocalY += markerDistance;
    }
    return markers;
}

function makeDiscreteMarkers(colorScale: ColorScale, left: number, top: number, barHeight: number): React.ReactNode[] {
    const minMarkerHeight = STYLE_CONSTANTS.fontSize + 2 * STYLE_CONSTANTS.textGap;

    const numSteps = colorScale.getNumSteps();
    let markerDistance = barHeight / numSteps;

    while (markerDistance < minMarkerHeight) {
        markerDistance += barHeight / numSteps;
    }

    let steps = Math.floor(barHeight / markerDistance);
    if (Math.abs(barHeight - steps * markerDistance) < minMarkerHeight) {
        steps--;
    }

    const markers: React.ReactNode[] = [];
    let currentLocalY = markerDistance;
    for (let i = 0; i < steps; i++) {
        const relValue = 1 - currentLocalY / barHeight;
        const value = colorScale.getMin() + (colorScale.getMax() - colorScale.getMin()) * relValue;

        const globalY = top + currentLocalY;

        markers.push(...makeMarkerElements(`${top}-${i}`, left, globalY, formatNumber(value)));

        currentLocalY += markerDistance;
    }

    return markers;
}

function makeCustomMarkers(
    colorScale: ColorScale,
    markerLabels: ColorScaleMarkerLabel[],
    left: number,
    top: number,
    barHeight: number,
): React.ReactNode[] {
    const markers: React.ReactNode[] = [];

    for (const [index, markerLabel] of markerLabels.entries()) {
        const normalizedValue = Math.min(Math.max(calcNormalizedValue(colorScale, markerLabel.value), 0), 1);
        const globalY = top + (1 - normalizedValue) * barHeight;

        markers.push(...makeMarkerElements(`${top}-${index}`, left, globalY, markerLabel.label));
    }

    return markers;
}

type ColorLegendProps = {
    id: string;
    colorScale: ColorScaleWithName;
    top: number;
    left: number;
    totalHeight: number;
    barWidth: number;
};

function ColorLegend(props: ColorLegendProps): React.ReactNode {
    const clipPathId = React.useId();
    const barHeight = props.totalHeight - STYLE_CONSTANTS.offset;
    const markerLabels = props.colorScale.getMarkerLabels();

    const barStartPosition = props.left + STYLE_CONSTANTS.nameLabelWidth + STYLE_CONSTANTS.textGap;
    const lineMarkerStartPosition = barStartPosition + props.barWidth;
    const lineMarkerEndPosition = lineMarkerStartPosition + STYLE_CONSTANTS.lineWidth;
    const textStartPosition = lineMarkerStartPosition + STYLE_CONSTANTS.lineWidth + STYLE_CONSTANTS.textGap;

    const markers: React.ReactNode[] = [];

    if (markerLabels?.length) {
        markers.push(
            makeCustomMarkers(
                props.colorScale,
                markerLabels,
                lineMarkerStartPosition,
                props.top + STYLE_CONSTANTS.offset,
                barHeight,
            ),
        );
    } else {
        markers.push(...makeMarkerElements("max", lineMarkerStartPosition, props.top + STYLE_CONSTANTS.offset, formatNumber(props.colorScale.getMax())));

        if (props.colorScale.getType() === ColorScaleType.Discrete) {
            markers.push(
                makeDiscreteMarkers(
                    props.colorScale,
                    lineMarkerStartPosition,
                    props.top + STYLE_CONSTANTS.offset,
                    barHeight,
                ),
            );
        } else if (props.colorScale.getGradientType() === ColorScaleGradientType.Diverging) {
            const relY =
                1 -
                (props.colorScale.getDivMidPoint() - props.colorScale.getMin()) /
                    (props.colorScale.getMax() - props.colorScale.getMin());

            markers.push(
                makeMarkers(
                    props.colorScale,
                    props.top + STYLE_CONSTANTS.offset,
                    props.top + STYLE_CONSTANTS.offset,
                    props.top + STYLE_CONSTANTS.offset + barHeight * relY,
                    lineMarkerStartPosition,
                    barHeight,
                ),
            );

            markers.push(
                <line
                    key="mid-marker"
                    x1={lineMarkerStartPosition}
                    y1={props.top + relY * barHeight + STYLE_CONSTANTS.offset}
                    x2={lineMarkerEndPosition}
                    y2={props.top + relY * barHeight + STYLE_CONSTANTS.offset}
                    stroke={STYLE_CONSTANTS.lineColor}
                    strokeWidth="2"
                />,
            );
            markers.push(
                <text
                    key="mid-text"
                    x={
                        props.left +
                        props.barWidth +
                        STYLE_CONSTANTS.lineWidth +
                        STYLE_CONSTANTS.textGap +
                        STYLE_CONSTANTS.nameLabelWidth +
                        STYLE_CONSTANTS.textGap
                    }
                    y={props.top + relY * barHeight + STYLE_CONSTANTS.offset + 3}
                    fontSize="10"
                    style={TEXT_STYLE}
                >
                    {formatNumber(props.colorScale.getDivMidPoint())}
                </text>,
            );

            markers.push(
                makeMarkers(
                    props.colorScale,
                    props.top + STYLE_CONSTANTS.offset,
                    props.top + relY * barHeight + STYLE_CONSTANTS.offset,
                    props.top + STYLE_CONSTANTS.offset + barHeight,
                    lineMarkerStartPosition,
                    barHeight,
                ),
            );
        } else {
            markers.push(
                makeMarkers(
                    props.colorScale,
                    props.top + STYLE_CONSTANTS.offset,
                    props.top + STYLE_CONSTANTS.offset,
                    props.top + STYLE_CONSTANTS.offset + barHeight,
                    lineMarkerStartPosition,
                    barHeight,
                ),
            );
        }

        markers.push(...makeMarkerElements("min", lineMarkerStartPosition, props.top + STYLE_CONSTANTS.offset + barHeight, formatNumber(props.colorScale.getMin())));
    }

    return (
        <g key={`color-scale-${makeGradientId(props.id)}`}>
            <clipPath id={`clip-${clipPathId}`}>
                <rect
                    x={props.left - props.totalHeight / 2}
                    y={props.top + STYLE_CONSTANTS.offset + props.totalHeight / 2}
                    width={props.totalHeight}
                    height={12}
                />
            </clipPath>
            <rect
                key={props.id}
                x={barStartPosition}
                y={props.top + STYLE_CONSTANTS.offset}
                width={props.barWidth}
                rx="4"
                height={barHeight}
                fill={`url(#${makeGradientId(props.id)})`}
                stroke="#555"
            />
            <text
                x={props.left + 2}
                y={props.top + STYLE_CONSTANTS.offset + props.totalHeight / 2 + 6}
                width={props.totalHeight}
                height={10}
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="central"
                alignmentBaseline="baseline"
                transform={`rotate(270, ${props.left}, ${props.top + STYLE_CONSTANTS.offset + props.totalHeight / 2})`}
                style={TEXT_STYLE}
                clipPath={`url(#clip-${clipPathId})`}
            >
                {props.colorScale.getName()}
            </text>
            {markers}
        </g>
    );
}

export type ColorLegendsContainerProps = {
    colorScales: ColorScaleWithId[];
    height: number;
    position?: "left" | "right";
};

export function ColorLegendsContainer(props: ColorLegendsContainerProps): React.ReactNode {
    if (props.colorScales.length === 0) {
        return null;
    }

    const width = Math.max(5, Math.min(10, 120 / props.colorScales.length));
    const minHeight = Math.min(60 + 2 * STYLE_CONSTANTS.offset, props.height);

    const numRows = Math.min(Math.floor(props.height / minHeight), props.colorScales.length);
    const numCols = Math.ceil(props.colorScales.length / numRows);
    const height = Math.max(minHeight, props.height / numRows - (numRows - 1) * STYLE_CONSTANTS.legendGap);

    function makeLegends(): React.ReactNode[] {
        const legends: React.ReactNode[] = [];
        let index = 0;
        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                if (index >= props.colorScales.length) {
                    break;
                }
                const { id, colorScale } = props.colorScales[index++];
                const top = row * (height + 2 * STYLE_CONSTANTS.offset) + row * STYLE_CONSTANTS.legendGap;
                const left =
                    col *
                    (width +
                        STYLE_CONSTANTS.legendGap +
                        STYLE_CONSTANTS.lineWidth +
                        STYLE_CONSTANTS.textGap +
                        STYLE_CONSTANTS.textWidth +
                        STYLE_CONSTANTS.nameLabelWidth);

                legends.push(
                    <ColorLegend
                        key={id}
                        id={id}
                        colorScale={colorScale}
                        top={top}
                        left={left}
                        totalHeight={height}
                        barWidth={width}
                    />,
                );
            }
        }
        return legends;
    }

    return (
        <div
            className={resolveClassNames("absolute bottom-8 flex gap-2 z-50", {
                "left-0": props.position === "left" || props.position === undefined,
                "right-0": props.position === "right",
            })}
        >
            <svg
                style={{
                    height: numRows * (height + 2 * STYLE_CONSTANTS.offset) + (numRows - 1) * STYLE_CONSTANTS.legendGap,
                    width:
                        numCols *
                        (width +
                            STYLE_CONSTANTS.legendGap +
                            STYLE_CONSTANTS.lineWidth +
                            STYLE_CONSTANTS.textGap +
                            STYLE_CONSTANTS.textWidth),
                }}
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {props.colorScales.map((el) => {
                        const { id, colorScale } = el;
                        if (colorScale.getMin() === colorScale.getMax()) {
                            return null;
                        }
                        return <GradientDef id={id} key={id} colorScale={colorScale} />;
                    })}
                </defs>
                {makeLegends()}
            </svg>
        </div>
    );
}

type GradientDefProps = {
    id: string;
    colorScale: ColorScale;
};

function GradientDef(props: GradientDefProps): React.ReactNode {
    const colorStops = props.colorScale.getColorStops();
    const gradientId = makeGradientId(props.id);

    return (
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {colorStops.toReversed().map((colorStop, index) => (
                <stop
                    key={index}
                    offset={`${((1 - colorStop.offset) * 100).toFixed(2)}%`}
                    stopColor={colorStop.color}
                />
            ))}
        </linearGradient>
    );
}

function makeGradientId(id: string): string {
    return `color-legend-gradient-${id}`;
}

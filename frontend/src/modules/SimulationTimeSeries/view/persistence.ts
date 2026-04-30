import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import type { ChartZoomState } from "@modules/_shared/eCharts";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { chartZoomAtom } from "./atoms/baseAtoms";
import { activeTimestampUtcMsAtom } from "./atoms/persistableFixableAtoms";

type SerializedAxisZoomState = {
    start: number;
    end: number;
};

type SerializedChartZoomState = {
    x?: SerializedAxisZoomState;
    y?: SerializedAxisZoomState;
};

export type SerializedView = {
    activeTimestampUtcMs: number | null;
    chartZoomState?: SerializedChartZoomState;
};

const schemaBuilder = new SchemaBuilder<SerializedView>(() => ({
    properties: {
        activeTimestampUtcMs: { type: "float64", nullable: true }, // Using float64 for Unix time in ms
    },
    optionalProperties: {
        chartZoomState: {
            optionalProperties: {
                x: {
                    properties: {
                        start: { type: "float64" },
                        end: { type: "float64" },
                    },
                },
                y: {
                    properties: {
                        start: { type: "float64" },
                        end: { type: "float64" },
                    },
                },
            },
        },
    },
}));

export const SERIALIZED_VIEW_SCHEMA = schemaBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    const tmp = get(activeTimestampUtcMsAtom).value;
    const chartZoomState = get(chartZoomAtom);

    return {
        activeTimestampUtcMs: tmp,
        chartZoomState: serializeChartZoomState(chartZoomState),
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    setIfDefined(set, activeTimestampUtcMsAtom, raw.activeTimestampUtcMs);
    setIfDefined(set, chartZoomAtom, raw.chartZoomState);
};

function serializeChartZoomState(chartZoomState: ChartZoomState): SerializedChartZoomState {
    return {
        ...(chartZoomState.x && { x: { start: chartZoomState.x.start, end: chartZoomState.x.end } }),
        ...(chartZoomState.y && { y: { start: chartZoomState.y.start, end: chartZoomState.y.end } }),
    };
}

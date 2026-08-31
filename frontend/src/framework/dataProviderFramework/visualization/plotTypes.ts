import type { IndexColumnValue } from "@framework/domain/RealizationTable";

export enum PlotDimension {
    NONE = "none",
    ENSEMBLE = "ensemble",
    PROVIDER = "provider",
    REALIZATION = "realization",
    VECTOR = "vector",
    RESULT = "result",
    ZONE = "ZONE",
    REGION = "REGION",
    FACIES = "FACIES",
    LICENSE = "LICENSE",
    SENSITIVITY = "SENSITIVITY_NAME",
    SENSITIVITY_CASE = "SENSITIVITY_CASE",
}

export type SeriesPointIdentity = {
    realization?: number;
    timestampUtcMs?: number;
    indexValues?: Readonly<Record<string, IndexColumnValue>>;
    wellboreMd?: number;
};

export type SeriesIdentityMap = readonly (SeriesPointIdentity | null)[];

export type SeriesRole = "primary" | "history" | "observation" | "statistics-line" | "statistics-band";

export type SeriesVisualization = {
    groupKeys: Readonly<Record<string, string | number>>;
    role: SeriesRole;
    points: {
        x: ArrayLike<number | string>;
        y: ArrayLike<number>;
    };
    identity?: SeriesIdentityMap;
    styleHints?: {
        preferredColor?: string;
        dash?: string;
    };
};
import type { IndexColumnValue } from "@framework/domain/RealizationTable";

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
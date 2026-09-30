import type { RequestHandler } from "msw";

import { authHandlers } from "../handlers/auth";
import { exploreHandlers } from "../handlers/explore";
import { parametersHandlers } from "../handlers/parameters";
import { persistenceHandlers } from "../handlers/persistence";
import { surfaceHandlers } from "../handlers/surface";
import { timeseriesHandlers } from "../handlers/timeseries";

/** One synthetic case with one ensemble of 10 realizations; timeseries, parameters and depth surfaces. */
export const basicEnsembleHandlers: RequestHandler[] = [
    ...authHandlers,
    ...persistenceHandlers,
    ...exploreHandlers,
    ...parametersHandlers,
    ...timeseriesHandlers,
    ...surfaceHandlers,
];

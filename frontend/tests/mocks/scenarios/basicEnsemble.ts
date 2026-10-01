import type { RequestHandler } from "msw";

import { authHandlers } from "../handlers/auth";
import { exploreHandlers } from "../handlers/explore";
import { inplaceVolumesHandlers } from "../handlers/inplaceVolumes";
import { parametersHandlers } from "../handlers/parameters";
import { persistenceHandlers } from "../handlers/persistence";
import { surfaceHandlers } from "../handlers/surface";
import { timeseriesHandlers } from "../handlers/timeseries";

/** One synthetic case with one ensemble of 10 realizations; timeseries, parameters, depth surfaces and inplace volumes. */
export const basicEnsembleHandlers: RequestHandler[] = [
    ...authHandlers,
    ...persistenceHandlers,
    ...exploreHandlers,
    ...parametersHandlers,
    ...timeseriesHandlers,
    ...surfaceHandlers,
    ...inplaceVolumesHandlers,
];

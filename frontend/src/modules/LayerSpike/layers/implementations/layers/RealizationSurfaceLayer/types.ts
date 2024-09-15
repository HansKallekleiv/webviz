import { EnsembleIdent } from "@framework/EnsembleIdent";

import { SettingType } from "../../../settingsTypes";
import { PolygonsIdent } from "../../settings/FaultPolygons";

export type RealizationSurfaceSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
    // [SettingType.FAULT_POLYGONS]: PolygonsIdent | null;
};

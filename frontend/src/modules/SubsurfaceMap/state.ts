import { ColorScale } from "@lib/utils/ColorScale";
import { PolygonsAddress } from "@modules/_shared/Polygons/polygonsAddress";
import { SurfaceAddress } from "@modules/_shared/Surface";

import { SurfaceMeshLayerSettings, ViewSettings } from "./_utils";

export interface state {
    surfaceAddresses: SurfaceAddress[] | null;
    surfaceColorScale: ColorScale | null;
    polygonsAddress: PolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
}

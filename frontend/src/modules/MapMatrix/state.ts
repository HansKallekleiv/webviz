import { SmdaWellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

import { FaultPolygonsSpecification, SurfaceSpecification, ViewSpecification } from "./types";

export const MapMatrixDefaultState: State = {
    viewSpecifications: [],
    smdaWellBoreAddresses: [],
};
export type State = {
    viewSpecifications: ViewSpecification[];
    smdaWellBoreAddresses: SmdaWellBoreAddress[];
};

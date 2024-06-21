import { isDevMode } from "@lib/utils/devMode";

import "./3DViewer/registerModule";
import "./DistributionPlot/registerModule";
import "./FlowNetwork/registerModule";
import "./InplaceVolumetrics/registerModule";
import "./InplaceVolumetricsTable/registerModule";
// import "./Grid3DVTK/registerModule";
import "./Intersection/registerModule";
// import "./Grid3D/registerModule";
// import "./Grid3DIntersection/registerModule";
// import "./Grid3DVTK/registerModule";
import "./Map/registerModule";
import "./ParameterDistributionMatrix/registerModule";
import "./Pvt/registerModule";
import "./Rft/registerModule";
import "./SeismicIntersection/registerModule";
import "./SimulationTimeSeries/registerModule";
import "./SimulationTimeSeriesMatrix/registerModule";
import "./SimulationTimeSeriesSensitivity/registerModule";
import "./StructuralUncertaintyIntersection/registerModule";
import "./SubsurfaceMap/registerModule";
import "./TornadoChart/registerModule";
import "./WellCompletions/registerModule";

if (isDevMode()) {
    await import("./MyModule/registerModule");
    await import("./MyModule2/registerModule");
    await import("./DbgWorkbenchSpy/registerModule");
}

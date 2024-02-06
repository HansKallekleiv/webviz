import React, { useId } from "react";

import { RealizationsSurfaceSetSpec_api } from "@api";
import {
    IntersectionReferenceSystem,

    Trajectory,
} from "@equinor/esv-intersection";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { useWellTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { isEqual } from "lodash";

import { EsvIntersection } from "./components/esvIntersection";
import {
    SurfacePolyLineSpec,

    useSampleSurfaceInPointsQueries,

} from "./queryHooks";
import { State } from "./state";
import {
    makeExtendedTrajectoryFromTrajectoryXyzPoints,
    makeTrajectoryXyzPointsFromWellboreTrajectory,
} from "./utils/esvIntersectionDataConversion";
import Legend from "./components/Legend";

export const View = ({ moduleContext }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement | null>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(moduleContext);

    const surfaceSetAddress = moduleContext.useStoreValue("SurfaceSetAddress");
    const visualizationMode = moduleContext.useStoreValue("visualizationMode");
    const statisticFunctions = moduleContext.useStoreValue("statisticFunctions");
    const wellboreAddress = moduleContext.useStoreValue("wellboreAddress");
    const intersectionSettings = moduleContext.useStoreValue("intersectionSettings");
    const stratigraphyColorMap = moduleContext.useStoreValue("stratigraphyColorMap");

    // Extended wellbore trajectory for creating intersection/fence extended on both sides of wellbore
    const [extendedWellboreTrajectory, setExtendedWellboreTrajectory] = React.useState<Trajectory | null>(null);

    const [renderWellboreTrajectoryXyzPoints, setRenderWellboreTrajectoryXyzPoints] = React.useState<number[][] | null>(
        null
    );
    // Data for seismic fence layer in esv-intersection
    const width = wrapperDivSize.width;
    const height = wrapperDivSize.height - 100;

    // Get well trajectories query
    const getWellTrajectoriesQuery = useWellTrajectoriesQuery(wellboreAddress ? [wellboreAddress.uuid] : undefined);
    if (getWellTrajectoriesQuery.isError) {
        statusWriter.addError("Error loading well trajectories");
    }
    const [surfacePolyLineSpec, setSurfacePolyLineSpec] = React.useState<SurfacePolyLineSpec | null>(null);
    let candidateSurfacePolyLineSpec = surfacePolyLineSpec;
    // Use first trajectory and create polyline for seismic fence query, and extended wellbore trajectory for generating seismic fence image

    if (getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length !== 0) {
        const trajectoryXyzPoints = makeTrajectoryXyzPointsFromWellboreTrajectory(getWellTrajectoriesQuery.data[0]);
        const newExtendedWellboreTrajectory = makeExtendedTrajectoryFromTrajectoryXyzPoints(
            trajectoryXyzPoints,
            intersectionSettings.extension
        );

        // If the new extended trajectory is different, update the polyline, but keep the seismic fence image
        if (!isEqual(newExtendedWellboreTrajectory, extendedWellboreTrajectory)) {
            setExtendedWellboreTrajectory(newExtendedWellboreTrajectory);

        }

        // When new well trajectory 3D points are loaded, update the render trajectory and clear the seismic fence image
        if (!isEqual(trajectoryXyzPoints, renderWellboreTrajectoryXyzPoints)) {
            setRenderWellboreTrajectoryXyzPoints(trajectoryXyzPoints);
        }
    }
    const realEnsembleIdent: EnsembleIdent = EnsembleIdent.fromCaseUuidAndEnsembleName(
        surfaceSetAddress?.caseUuid ?? "",
        surfaceSetAddress?.ensembleName ?? ""
    );

    let realizationsSurfaceSetSpec_api: RealizationsSurfaceSetSpec_api | null = null;
    if (surfaceSetAddress) {
        realizationsSurfaceSetSpec_api = {
            surface_names: surfaceSetAddress.names,
            surface_attribute: surfaceSetAddress.attribute,
            realization_nums: surfaceSetAddress.realizationNums ?? [],
        };
    }

    const x_points = extendedWellboreTrajectory?.points.map((coord) => coord[0]) ?? [];
    const y_points = extendedWellboreTrajectory?.points.map((coord) => coord[1]) ?? [];

    const cum_length = extendedWellboreTrajectory
        ? IntersectionReferenceSystem.toDisplacement(
            extendedWellboreTrajectory.points,
            extendedWellboreTrajectory.offset
        ).map((coord) => coord[0] - intersectionSettings.extension)
        : [];

    candidateSurfacePolyLineSpec = { x_points, y_points, cum_length };

    const sampleSurfaceInPointsQueries = useSampleSurfaceInPointsQueries(
        realEnsembleIdent,
        realizationsSurfaceSetSpec_api,
        x_points,
        y_points,
        true
    );

    statusWriter.setLoading(getWellTrajectoriesQuery.isFetching || sampleSurfaceInPointsQueries.isFetching);
    // Build up an error string handling multiple errors. e.g. "Error loading well trajectories and seismic fence data"
    // Do not useMemo
    let errorString = "";
    if (getWellTrajectoriesQuery.isError) {
        errorString += "Error loading well trajectories";
    }


    if (errorString !== "") {
        statusWriter.addError(errorString);
    }
    const stratigraphyColorLegendItems = surfaceSetAddress?.names.map((key) => {
        return { color: stratigraphyColorMap[key], label: key };
    }
    ) ?? [];


    return (
        <div ref={wrapperDivRef} className="w-full h-full relative
        ">
            {errorString !== "" ? (
                <ContentError>{errorString}</ContentError>
            ) : (
                <>
                    <EsvIntersection
                        width={width}
                        height={height}
                        zScale={5}
                        extension={5}
                        wellborePath={renderWellboreTrajectoryXyzPoints}
                        surfaceRealizationSetSamplePointsData={sampleSurfaceInPointsQueries.data}
                        visualizationMode={visualizationMode}
                        statisticFunctions={statisticFunctions}
                        cumLength={cum_length}
                        stratigraphyColorMap={stratigraphyColorMap}
                    />
                    <div className="absolute bottom-0 left-0 right-0">
                        <Legend items={stratigraphyColorLegendItems} />
                    </div>
                </>
            )}
        </div>
    );
};

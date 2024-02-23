import React from "react";

import { SurfaceDataPng_api, WellBoreTrajectory_api } from "@api";
import { View } from "@deck.gl/core/typed";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { colorTablesObj } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { IconButton } from "@lib/components/IconButton";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { SurfaceAddressFactory } from "@modules/_shared/Surface";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore";
import { SyncedSubsurfaceViewer } from "@modules/_shared/components/SubsurfaceViewer";
import {
    createAxes2DLayer,
    createSubsurfaceMapColorPalettes,
    createSurfaceImageLayer,
    createWellBoreHeaderLayer,
    createWellboreTrajectoryLayer,
} from "@modules/_shared/components/SubsurfaceViewer/utils";
import { Home } from "@mui/icons-material";
import { ViewportType, ViewsType } from "@webviz/subsurface-viewer";
import { ViewFooter } from "@webviz/subsurface-viewer/dist/components/ViewFooter";

import { isEqual } from "lodash";

import { SubsurfaceMapViewLabel } from "./components/subsurfaceMapViewLabel";

import {
    IndexedSurfaceData,
    IndexedSurfaceDataQueryResults,
    useSurfaceDataSetQueryByAddresses,
} from "../hooks/useSurfaceDataAsPngQuery";
import { State } from "../state";
import { EnsembleStageType, SurfaceSpecification, ViewSpecification } from "../types";

export function view({ moduleContext, workbenchServices, workbenchSettings }: ModuleFCProps<State>) {
    const [viewportBounds, setviewPortBounds] = React.useState<[number, number, number, number] | undefined>(undefined);

    const viewSpecifications = moduleContext.useStoreValue("viewSpecifications");
    const wellBoreAddresses = moduleContext.useStoreValue("smdaWellBoreAddresses");

    const firstCaseUuid = viewSpecifications?.[0]?.ensembleIdent?.getCaseUuid() ?? undefined;
    const statusWriter = useViewStatusWriter(moduleContext);

    const wellTrajectoriesQuery = useFieldWellsTrajectoriesQuery(firstCaseUuid);
    statusWriter.setLoading(wellTrajectoriesQuery.isFetching);

    const layers: Record<string, unknown>[] = [];
    layers.push(createAxes2DLayer());

    if (wellTrajectoriesQuery.data) {
        const wellBoreUUids = wellBoreAddresses?.map((well) => well.uuid) ?? [];
        const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            wellBoreUUids.includes(well.wellbore_uuid)
        );
        const wellTrajectoryLayer: Record<string, unknown> = createWellboreTrajectoryLayer(wellTrajectories);
        const wellBoreHeaderLayer: Record<string, unknown> = createWellBoreHeaderLayer(wellTrajectories);
        layers.push(wellTrajectoryLayer);
        layers.push(wellBoreHeaderLayer);
    }

    const surfaceSpecifications: SurfaceSpecification[] = viewSpecifications.map((viewSpecification) => {
        return {
            ensembleIdent: viewSpecification.ensembleIdent,
            surfaceName: viewSpecification.surfaceName,
            surfaceAttribute: viewSpecification.surfaceAttribute,
            surfaceTimeOrInterval: viewSpecification.surfaceTimeOrInterval,
            realizationNum: viewSpecification.realizationNum,
            uuid: viewSpecification.uuid,
            statisticFunction: viewSpecification.statisticFunction,
            realizationNumsStatistics: viewSpecification.realizationNumsStatistics,
            ensembleStage: viewSpecification.ensembleStage,
            colorRange: viewSpecification.colorRange,
            colorPaletteId: viewSpecification.colorPaletteId,
        };
    });
    const surfaceAddresses = createSurfaceAddressesFromSpecifications(surfaceSpecifications);

    const surfaceDataSetQueryByAddresses = useSurfaceDataSetQueryByAddresses(surfaceAddresses);
    statusWriter.setLoading(surfaceDataSetQueryByAddresses.isFetching);

    const [prevSurfaceDataSetQueryByAddresses, setPrevSurfaceDataSetQueryByAddresses] =
        React.useState<IndexedSurfaceDataQueryResults | null>(null);

    let surfaceDataSet: IndexedSurfaceData[] = [];

    if (
        !surfaceDataSetQueryByAddresses.isFetching &&
        !isEqual(prevSurfaceDataSetQueryByAddresses, surfaceDataSetQueryByAddresses)
    ) {
        setPrevSurfaceDataSetQueryByAddresses(surfaceDataSetQueryByAddresses);
        surfaceDataSet = surfaceDataSetQueryByAddresses.data;
    } else if (prevSurfaceDataSetQueryByAddresses) {
        surfaceDataSet = prevSurfaceDataSetQueryByAddresses.data;
    }

    // Needed to avoid resetting the viewports on every render
    const [existingViews, setExistingViews] = React.useState<ViewsType>(makeEmptyViews(viewSpecifications.length ?? 1));
    const views: ViewsType = makeEmptyViews(viewSpecifications.length ?? 1);

    const viewAnnotations: JSX.Element[] = [];
    const colorTables = createSubsurfaceMapColorPalettes();

    viewSpecifications.forEach((viewSpec, index) => {
        const surface = surfaceDataSet[index];
        const colorRange = viewSpec.colorRange ?? [null, null];

        const valueMin = surface?.surfaceData?.val_min ?? 0;
        const valueMax = surface?.surfaceData?.val_max ?? 0;
        if (surface.surfaceData) {
            const newBounds: [number, number, number, number] = [
                surface.surfaceData.x_min,
                surface.surfaceData.y_min,
                surface.surfaceData.x_max,
                surface.surfaceData.y_max,
            ];
            if (!viewportBounds) {
                setviewPortBounds(newBounds);
            }

            layers.push(
                createSurfaceImageLayer({
                    id: `surface-${index}`,
                    base64ImageString: surface.surfaceData.base64_encoded_image,
                    xMin: surface.surfaceData.x_min_surf_orient,
                    yMin: surface.surfaceData.y_min_surf_orient,
                    xMax: surface.surfaceData.x_max_surf_orient,
                    yMax: surface.surfaceData.y_max_surf_orient,
                    rotDeg: surface.surfaceData.rot_deg,
                    valueMin,
                    valueMax,
                    colorMin: colorRange[0],
                    colorMax: colorRange[1],
                    colorPaletteId: viewSpec.colorPaletteId ?? "",
                })
            );
            views.viewports[index] = {
                id: `${index}view`,
                show3D: false,
                isSync: true,
                layerIds: ["axes-layer2D", `surface-${index}`, "wells-layer", "well-header-layer"],
                name: `Surface ${index}`,
            };
        }
        viewAnnotations.push(
            makeViewAnnotation(
                `${index}view`,
                viewSpecifications[index],
                colorTables,
                colorRange[0] || valueMin,
                colorRange[1] || valueMax
            )
        );
    });
    if (!isEqual(existingViews, views)) {
        setExistingViews(views);
    }

    return (
        <div className="w-full h-full flex">
            <div className="relative w-full h-full  flex-col z-1">
                <SyncedSubsurfaceViewer
                    id={"test"}
                    layers={layers}
                    views={existingViews}
                    colorTables={colorTables}
                    bounds={viewportBounds || undefined}
                    workbenchServices={workbenchServices}
                    moduleContext={moduleContext}
                >
                    {viewAnnotations}
                </SyncedSubsurfaceViewer>
            </div>
            <div className="flex-col">
                <IconButton size="large" onClick={() => setviewPortBounds(undefined)}>
                    <Home />
                </IconButton>
            </div>
        </div>
    );
}
function makeViewAnnotation(
    id: string,
    viewSpecification: ViewSpecification,
    colorTables: colorTablesObj[],
    colorMin: number,
    colorMax: number
): JSX.Element {
    return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        /* @ts-expect-error */
        <View key={id} id={id}>
            <>
                <ContinuousLegend
                    id={`legend-${id}`}
                    min={colorMin}
                    max={colorMax}
                    colorName={viewSpecification.colorPaletteId ?? ""}
                    colorTables={colorTables}
                    cssLegendStyles={{ top: "20px", right: "0px", backgroundColor: "transparent" }}
                    legendScaleSize={0.1}
                    legendFontSize={30}
                />
                <ViewFooter>
                    <SubsurfaceMapViewLabel viewSpecification={viewSpecification} />
                </ViewFooter>
            </>
        </View>
    );
}

function makeEmptyViews(numSubplots: number): ViewsType {
    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);
    const viewPorts: ViewportType[] = [];
    for (let index = 0; index < numSubplots; index++) {
        viewPorts.push({
            id: `${index}view`,
            show3D: false,
            isSync: true,
            layerIds: [`surface-${index}`],
            name: `Surface ${index}`,
        });
    }
    return { layout: [numRows, numColumns], showLabel: true, viewports: viewPorts };
}

function createSurfaceAddressesFromSpecifications(
    surfaceSpecifications: SurfaceSpecification[]
): Array<SurfaceAddress | null> {
    const surfaceAddresses: Array<SurfaceAddress | null> = [];
    surfaceSpecifications.forEach((surface) => {
        if (surface.ensembleIdent && surface.surfaceName && surface.surfaceAttribute) {
            const factory = new SurfaceAddressFactory(
                surface.ensembleIdent?.getCaseUuid(),
                surface.ensembleIdent?.getEnsembleName(),
                surface.surfaceName,
                surface.surfaceAttribute,
                surface.surfaceTimeOrInterval
            );
            if (surface.ensembleStage === EnsembleStageType.Realization && surface.realizationNum !== null) {
                const surfaceAddress = factory.createRealizationAddress(surface.realizationNum);
                surfaceAddresses.push(surfaceAddress);
            }
            if (surface.ensembleStage === EnsembleStageType.Statistics) {
                const surfaceAddress = factory.createStatisticalAddress(
                    surface.statisticFunction,
                    surface.realizationNumsStatistics
                );
                surfaceAddresses.push(surfaceAddress);
            }
            if (surface.ensembleStage === EnsembleStageType.Observation) {
                const surfaceAddress = factory.createObservationAddress();
                surfaceAddresses.push(surfaceAddress);
            }
        } else {
            surfaceAddresses.push(null);
        }
    });
    return surfaceAddresses;
}

type SurfaceFaultPolygonSpecification = {
    surfaceName: string | null;
    defaultPolygonsName: string | null;
    polygonsAttribute: string | null;
};
function createFaultPolygonsAddressesFromSpecifications(
    surfaceFaultPolygonsSpecifications: Array<SurfaceFaultPolygonSpecification | null>
): Array<SurfaceAddress | null> {
    const surfaceAddresses: Array<SurfaceAddress | null> = [];
    surfaceSpecifications.forEach((surface) => {
        if (surface.ensembleIdent && surface.surfaceName && surface.surfaceAttribute) {
            const factory = new SurfaceAddressFactory(
                surface.ensembleIdent?.getCaseUuid(),
                surface.ensembleIdent?.getEnsembleName(),
                surface.surfaceName,
                surface.surfaceAttribute,
                surface.surfaceTimeOrInterval
            );
            if (surface.ensembleStage === EnsembleStageType.Realization && surface.realizationNum !== null) {
                const surfaceAddress = factory.createRealizationAddress(surface.realizationNum);
                surfaceAddresses.push(surfaceAddress);
            }
            if (surface.ensembleStage === EnsembleStageType.Statistics) {
                const surfaceAddress = factory.createStatisticalAddress(
                    surface.statisticFunction,
                    surface.realizationNumsStatistics
                );
                surfaceAddresses.push(surfaceAddress);
            }
            if (surface.ensembleStage === EnsembleStageType.Observation) {
                const surfaceAddress = factory.createObservationAddress();
                surfaceAddresses.push(surfaceAddress);
            }
        } else {
            surfaceAddresses.push(null);
        }
    });
    return surfaceAddresses;
}

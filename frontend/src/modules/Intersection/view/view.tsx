import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { GlobalTopicDefinitions, useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { IntersectionType } from "@framework/types/intersection";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { EsvIntersectionReadoutEvent, Viewport } from "@modules/_shared/components/EsvIntersection";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";

import { useAtomValue } from "jotai";
import { isEqual } from "lodash";

import { ViewAtoms } from "./atoms/atomDefinitions";
import { Intersection } from "./components/intersection";
import { useGridPolylineIntersection as useGridPolylineIntersectionQuery } from "./queries/polylineIntersection";
import { useWellboreCasingQuery } from "./queries/wellboreSchematicsQueries";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { selectedWellboreAtom } from "../sharedAtoms/sharedAtoms";
import { State } from "../state";

export function View(
    props: ModuleViewProps<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>
): JSX.Element {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const syncedSettingKeys = props.viewContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const ensembleIdent = props.viewContext.useSettingsToViewInterfaceValue("ensembleIdent");
    const intersectionReferenceSystem = props.viewContext.useViewAtomValue("intersectionReferenceSystemAtom");
    const wellboreHeader = useAtomValue(selectedWellboreAtom);

    const [hoveredMd, setHoveredMd] = React.useState<number | null>(null);
    const [prevHoveredMd, setPrevHoveredMd] = React.useState<GlobalTopicDefinitions["global.hoverMd"] | null>(null);
    const syncedHoveredMd = useSubscribedValue(
        "global.hoverMd",
        props.workbenchServices,
        props.viewContext.getInstanceIdString()
    );

    if (!isEqual(syncedHoveredMd, prevHoveredMd)) {
        setPrevHoveredMd(syncedHoveredMd);
        if (syncedHoveredMd?.wellboreUuid === wellboreHeader?.uuid) {
            setHoveredMd(syncedHoveredMd?.md ?? null);
        } else {
            setHoveredMd(null);
        }
    }

    const syncedCameraPosition = syncHelper.useValue(
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        "global.syncValue.cameraPositionIntersection"
    );

    const syncedVerticalScale = syncHelper.useValue(SyncSettingKey.VERTICAL_SCALE, "global.syncValue.verticalScale");

    const realization = props.viewContext.useSettingsToViewInterfaceValue("realization");
    const gridModelName = props.viewContext.useSettingsToViewInterfaceValue("gridModelName");
    const gridModelBoundingBox3d = props.viewContext.useSettingsToViewInterfaceValue("gridModelBoundingBox3d");
    const gridModelParameterName = props.viewContext.useSettingsToViewInterfaceValue("gridModelParameterName");
    const gridModelParameterDateOrInterval = props.viewContext.useSettingsToViewInterfaceValue(
        "gridModelParameterDateOrInterval"
    );
    const showGridLines = props.viewContext.useSettingsToViewInterfaceValue("showGridlines");
    const intersectionExtensionLength =
        props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");
    const intersectionType = props.viewContext.useSettingsToViewInterfaceValue("intersectionType");

    let ensembleName = "";
    if (ensembleIdent) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        ensembleName = ensemble?.getDisplayName() ?? "";
    }

    props.viewContext.setInstanceTitle(
        `${wellboreHeader?.identifier} - ${gridModelName ?? "-"}, ${gridModelParameterName ?? "-"}, ${
            gridModelParameterDateOrInterval ?? "-"
        } (${ensembleName})`
    );

    const polylineUtmXy: number[] = [];
    let hoveredMdPoint3d: number[] | null = null;

    if (intersectionReferenceSystem) {
        if (hoveredMd) {
            const [x, y] = intersectionReferenceSystem.getPosition(hoveredMd);
            const [, z] = intersectionReferenceSystem.project(hoveredMd);
            hoveredMdPoint3d = [x, y, z];
        }
    }

    // Polyline intersection query
    const polylineIntersectionQuery = useGridPolylineIntersectionQuery(
        ensembleIdent ?? null,
        gridModelName,
        gridModelParameterName,
        gridModelParameterDateOrInterval,
        realization,
        polylineUtmXy
    );
    if (polylineIntersectionQuery.isError) {
        statusWriter.addError(polylineIntersectionQuery.error.message);
    }

    // Wellbore casing query
    const wellboreCasingQuery = useWellboreCasingQuery(wellboreHeader?.uuid ?? undefined);
    if (wellboreCasingQuery.isError) {
        statusWriter.addError(wellboreCasingQuery.error.message);
    }

    // Set loading status
    statusWriter.setLoading(polylineIntersectionQuery.isFetching || wellboreCasingQuery.isFetching);

    const handleReadout = React.useCallback(
        function handleReadout(event: EsvIntersectionReadoutEvent) {
            const items = event.readoutItems;
            const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));
            const md = wellboreReadoutItem?.md;
            if (!md || !wellboreHeader) {
                props.workbenchServices.publishGlobalData("global.hoverMd", null);
                return;
            }
            props.workbenchServices.publishGlobalData(
                "global.hoverMd",
                { wellboreUuid: wellboreHeader.uuid, md: md },
                props.viewContext.getInstanceIdString()
            );
        },
        [props.workbenchServices, wellboreHeader, props.viewContext.getInstanceIdString()]
    );

    const handleCameraPositionChange = React.useCallback(
        function handleCameraPositionChange(cameraPosition: Viewport) {
            props.workbenchServices.publishGlobalData("global.syncValue.cameraPositionIntersection", cameraPosition);
        },
        [props.workbenchServices]
    );

    const handleVerticalScaleChange = React.useCallback(
        function handleVerticalScaleChange(verticalScale: number) {
            props.workbenchServices.publishGlobalData("global.syncValue.verticalScale", verticalScale);
        },
        [props.workbenchServices]
    );

    const potentialIntersectionExtensionLength =
        intersectionType === IntersectionType.WELLBORE ? intersectionExtensionLength : 0;

    return (
        <div className="w-full h-full">
            <Intersection
                referenceSystem={intersectionReferenceSystem}
                polylineIntersectionData={polylineIntersectionQuery.data ?? null}
                wellboreCasingData={wellboreCasingQuery.data ?? null}
                gridBoundingBox3d={gridModelBoundingBox3d}
                colorScale={colorScale}
                showGridLines={showGridLines}
                intersectionExtensionLength={potentialIntersectionExtensionLength}
                hoveredMd={hoveredMd}
                onReadout={handleReadout}
                onViewportChange={handleCameraPositionChange}
                onVerticalScaleChange={handleVerticalScaleChange}
                intersectionType={intersectionType}
                viewport={syncedCameraPosition ?? undefined}
                verticalScale={syncedVerticalScale ?? undefined}
            />
        </div>
    );
}

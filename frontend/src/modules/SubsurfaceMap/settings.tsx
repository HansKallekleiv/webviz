import React from "react";

import { SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { defaultContinuousSequentialColorPalettes } from "@framework/WorkbenchSettings";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import {
    ColorPaletteSelector,
    ColorPaletteSelectorType,
} from "@framework/internal/components/Settings/private-components/colorPaletteSettings";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { PolygonsAddress, PolygonsDirectory, usePolygonsDirectoryQuery } from "@modules/_shared/Polygons";
import {
    SurfaceAddress,
    SurfaceAddressFactory,
    SurfaceDirectory,
    SurfaceTimeType,
    useSurfaceDirectoryQuery,
} from "@modules/_shared/Surface";
import { useWellHeadersQuery } from "@modules/_shared/WellBore/queryHooks";

import { isEqual } from "lodash";

import { AggregationSelector } from "./components/AggregationSelector";
import { SurfaceColorSelector } from "./components/SurfaceColorSelector";
import { state } from "./state";

//-----------------------------------------------------------------------------------------------------------
type LabelledCheckboxProps = {
    label: string;
    checked: boolean;
    onChange: any;
};

function LabelledCheckbox(props: LabelledCheckboxProps): JSX.Element {
    return (
        <Label wrapperClassName=" text-xs flow-root" labelClassName="float-left text-xs" text={props.label}>
            <div className=" float-right">
                <Checkbox onChange={props.onChange} checked={props.checked} />
            </div>
        </Label>
    );
}
function Header(props: { text: string }): JSX.Element {
    return <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mt-2">{props.text}</label>;
}
const SurfaceTimeTypeEnumToStringMapping = {
    [SurfaceTimeType.None]: "Static",
    [SurfaceTimeType.TimePoint]: "Time point",
    [SurfaceTimeType.Interval]: "Time interval",
};
export function Settings({
    moduleContext,
    workbenchSession,
    workbenchServices,
    workbenchSettings,
}: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render TopographicMap settings`);

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [selectedMeshSurfaceName, setSelectedMeshSurfaceName] = React.useState<string | null>(null);
    const [usePropertySurface, setUsePropertySurface] = React.useState<boolean>(false);
    const [selectedSurfaceNames, setSelectedSurfaceNames] = React.useState<string[]>([]);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [selectedSurfaceDates, setSelectedSurfaceDates] = React.useState<string[]>([]);
    const [timeType, setTimeType] = React.useState<SurfaceTimeType>(SurfaceTimeType.None);
    const [selectedPolygonName, setSelectedPolygonName] = React.useState<string | null>(null);
    const [selectedPolygonAttribute, setSelectedPolygonAttribute] = React.useState<string | null>(null);
    const [linkPolygonNameToSurfaceName, setLinkPolygonNameToSurfaceName] = React.useState<boolean>(true);
    const [selectedWellUuids, setSelectedWellUuids] = moduleContext.useStoreState("selectedWellUuids");
    const [showPolygon, setShowPolygon] = React.useState<boolean>(true);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction_api | null>(null);
    const [showContour, setShowContour] = React.useState(false);
    const [contourStartValue, setContourStartValue] = React.useState<number>(0);
    const [contourIncValue, setContourIncValue] = React.useState<number>(100);
    const [showGrid, setShowGrid] = React.useState(false);
    const [showSmoothShading, setShowSmoothShading] = React.useState(false);
    const [showMaterial, setShowMaterial] = React.useState(false);
    const [show3D, setShow3D] = React.useState(true);
    const [surfaceColorScale, setSurfaceColorScale] = moduleContext.useStoreState("surfaceColorScale");
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSurface = syncHelper.useValue(SyncSettingKey.SURFACE, "global.syncValue.surface");
    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    const propertySurfDirQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    const surfaceDirectory = new SurfaceDirectory(
        propertySurfDirQuery.data
            ? {
                  surfaceMetas: propertySurfDirQuery.data,
                  timeType: timeType,
              }
            : null
    );

    const fixedSurfaceSelections = fixupSelectedSurfaceSelections(
        surfaceDirectory,
        syncedValueSurface?.attribute ?? null,
        selectedSurfaceAttribute,
        selectedSurfaceNames,
        selectedSurfaceDates
    );

    const computedSurfaceAttribute = fixedSurfaceSelections.surfaceAttribute;
    const computedSurfaceNames = fixedSurfaceSelections.surfaceNames;
    const computedSurfaceDates = fixedSurfaceSelections.surfaceDates;

    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }

    if (!isEqual(computedSurfaceNames, selectedSurfaceNames)) {
        setSelectedSurfaceNames(computedSurfaceNames);
    }
    if (computedSurfaceDates && computedSurfaceDates !== computedSurfaceDates) {
        setSelectedSurfaceDates(computedSurfaceDates);
    }
    let surfaceNameOptions: SelectOption[] = [];
    let surfaceAttributeOptions: SelectOption[] = [];
    let surfaceTimeOptions: SelectOption[] = [];

    surfaceAttributeOptions = surfaceDirectory.getAttributeNames(null).map((attr) => ({ value: attr, label: attr }));
    surfaceNameOptions = surfaceDirectory
        .getSurfaceNames(computedSurfaceAttribute)
        .map((name) => ({ value: name, label: name }));

    if (timeType === SurfaceTimeType.Interval || timeType === SurfaceTimeType.TimePoint) {
        surfaceTimeOptions = surfaceDirectory
            .getTimeOrIntervalStrings(null, computedSurfaceAttribute)
            .map((interval) => ({
                value: interval,
                label:
                    timeType === SurfaceTimeType.TimePoint
                        ? isoStringToDateLabel(interval)
                        : isoIntervalStringToDateLabel(interval),
            }));
    }

    // Polygon
    const polygonsDirectoryQuery = usePolygonsDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    const polygonsDirectory = new PolygonsDirectory(
        polygonsDirectoryQuery.data
            ? {
                  polygonsMetas: polygonsDirectoryQuery.data,
                  //   includeAttributeTypes: [PolygonsAttributeType_api.DEPTH],
              }
            : null
    );

    const fixedPolygonsSpec = fixupPolygons(
        polygonsDirectory,
        {
            polygonsName: linkPolygonNameToSurfaceName ? selectedMeshSurfaceName : selectedPolygonName,
            polygonsAttribute: selectedPolygonAttribute,
        },
        { polygonsName: null, polygonsAttribute: null }
    );

    const computedPolygonsName = fixedPolygonsSpec.polygonsName;
    const computedPolygonsAttribute = fixedPolygonsSpec.polygonsAttribute;

    if (computedPolygonsName && computedPolygonsName !== selectedPolygonName) {
        setSelectedPolygonName(computedPolygonsName);
    }
    if (computedPolygonsAttribute && computedPolygonsAttribute !== selectedPolygonAttribute) {
        setSelectedPolygonAttribute(computedPolygonsAttribute);
    }
    let polyNameOptions: SelectOption[] = [];
    let polyAttributesOptions: SelectOption[] = [];
    polyNameOptions = polygonsDirectory.getPolygonsNames(null).map((name) => ({ value: name, label: name }));
    polyAttributesOptions = polygonsDirectory
        .getAttributeNames(computedPolygonsName)
        .map((attr) => ({ value: attr, label: attr }));

    React.useEffect(
        function propagatePropertySurfaceSelectionToView() {
            let surfaceAddresses: SurfaceAddress[] = [];

            if (computedEnsembleIdent && computedSurfaceNames.length && computedSurfaceAttribute) {
                for (const surfaceName of computedSurfaceNames) {
                    if (timeType !== SurfaceTimeType.None) {
                        for (const surfaceDate of computedSurfaceDates) {
                            const addrFactory = new SurfaceAddressFactory(
                                computedEnsembleIdent.getCaseUuid(),
                                computedEnsembleIdent.getEnsembleName(),
                                surfaceName,
                                computedSurfaceAttribute,
                                surfaceDate
                            );
                            const surfAddr = generateRealizationOrStatisticalAddress(
                                addrFactory,
                                realizationNum,
                                aggregation
                            );
                            surfaceAddresses.push(surfAddr);
                        }
                    } else {
                        const addrFactory = new SurfaceAddressFactory(
                            computedEnsembleIdent.getCaseUuid(),
                            computedEnsembleIdent.getEnsembleName(),
                            surfaceName,
                            computedSurfaceAttribute,
                            null
                        );
                        const surfAddr = generateRealizationOrStatisticalAddress(
                            addrFactory,
                            realizationNum,
                            aggregation
                        );
                        surfaceAddresses.push(surfAddr);
                    }
                }

                moduleContext.getStateStore().setValue("surfaceAddresses", surfaceAddresses);
            }
        },
        [
            selectedEnsembleIdent,
            selectedSurfaceNames,
            selectedSurfaceAttribute,
            selectedSurfaceDates,
            aggregation,
            realizationNum,
            computedEnsembleIdent,
            computedSurfaceNames,
            computedSurfaceAttribute,
            computedSurfaceDates,
            moduleContext,
        ]
    );
    React.useEffect(
        function propogatePolygonsSelectionToView() {
            let polygonAddr: PolygonsAddress | null = null;
            if (computedEnsembleIdent && computedPolygonsName && computedPolygonsAttribute && showPolygon) {
                polygonAddr = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensemble: computedEnsembleIdent.getEnsembleName(),
                    name: computedPolygonsName,
                    attribute: computedPolygonsAttribute,
                    realizationNum: realizationNum,
                };
            }

            moduleContext.getStateStore().setValue("polygonsAddress", polygonAddr);
        },
        [
            selectedEnsembleIdent,
            selectedMeshSurfaceName,
            selectedPolygonName,
            selectedPolygonAttribute,
            linkPolygonNameToSurfaceName,
            showPolygon,
            aggregation,
            realizationNum,
            computedEnsembleIdent,
            computedSurfaceNames,
            computedPolygonsName,
            computedPolygonsAttribute,
            moduleContext,
        ]
    );
    React.useEffect(
        function propogateSurfaceSettingsToView() {
            moduleContext.getStateStore().setValue("surfaceSettings", {
                contours: showContour ? [contourStartValue, contourIncValue] : false,
                gridLines: showGrid,
                smoothShading: showSmoothShading,
                material: showMaterial,
            });
        },
        [showContour, contourStartValue, contourIncValue, showGrid, showSmoothShading, showMaterial, moduleContext]
    );
    React.useEffect(
        function propogateSubsurfaceMapViewSettingsToView() {
            moduleContext.getStateStore().setValue("viewSettings", {
                show3d: show3D,
            });
        },
        [show3D, moduleContext]
    );

    const wellHeadersQuery = useWellHeadersQuery(computedEnsembleIdent?.getCaseUuid());
    let wellHeaderOptions: SelectOption[] = [];

    if (wellHeadersQuery.data) {
        wellHeaderOptions = wellHeadersQuery.data.map((header) => ({
            label: header.unique_wellbore_identifier,
            value: header.wellbore_uuid,
        }));
    }

    function handleWellsChange(selectedWellUuids: string[], allWellUuidsOptions: SelectOption[]) {
        const newSelectedWellUuids = selectedWellUuids.filter((wellUuid) =>
            allWellUuidsOptions.some((wellHeader) => wellHeader.value === wellUuid)
        );
        setSelectedWellUuids(newSelectedWellUuids);
    }
    function showAllWells(allWellUuidsOptions: SelectOption[]) {
        const newSelectedWellUuids = allWellUuidsOptions.map((wellHeader) => wellHeader.value);

        setSelectedWellUuids(newSelectedWellUuids);
    }
    function hideAllWells() {
        setSelectedWellUuids([]);
    }
    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handlePropertySurfAttributeSelectionChange(selectedSurfAttribute: string) {
        const newAttr = selectedSurfAttribute;
        setSelectedSurfaceAttribute(newAttr);
    }
    function handlePolyNameSelectionChange(selectedPolyNames: string[]) {
        const newName = selectedPolyNames[0] ?? null;
        setSelectedPolygonName(newName);
    }
    function handlePolyAttributeSelectionChange(selectedPolyAttributes: string[]) {
        const newAttr = selectedPolyAttributes[0] ?? null;
        setSelectedPolygonAttribute(newAttr);
    }
    function handleAggregationChanged(aggregation: SurfaceStatisticFunction_api | null) {
        setAggregation(aggregation);
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const realNum = parseInt(event.target.value, 10);
        if (realNum >= 0) {
            setRealizationNum(realNum);
        }
    }
    function handleContourStartChange(event: React.ChangeEvent<HTMLInputElement>) {
        const contourStart = parseInt(event.target.value, 10);
        if (contourStart >= 0) {
            setContourStartValue(contourStart);
        }
    }
    function handleContourIncChange(event: React.ChangeEvent<HTMLInputElement>) {
        const contourInc = parseInt(event.target.value, 10);
        if (contourInc > 0) {
            setContourIncValue(contourInc);
        }
    }
    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeType(event.target.value as SurfaceTimeType);
    }
    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble and realization">
                <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                    <SingleEnsembleSelect
                        ensembleSet={ensembleSet}
                        value={computedEnsembleIdent ? computedEnsembleIdent : null}
                        onChange={handleEnsembleSelectionChange}
                    />
                </Label>
                <AggregationSelector
                    selectedAggregation={aggregation}
                    onAggregationSelectorChange={handleAggregationChanged}
                />
                {aggregation === null && (
                    <Label text="Realization:">
                        <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
                    </Label>
                )}
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Attribute surface">
                <>
                    <QueryStateWrapper
                        queryResult={propertySurfDirQuery}
                        errorComponent={"Error loading surface directory"}
                        loadingComponent={<CircularProgress />}
                    >
                        <RadioGroup
                            value={timeType}
                            direction="horizontal"
                            options={Object.values(SurfaceTimeType).map((val: SurfaceTimeType) => {
                                return { value: val, label: SurfaceTimeTypeEnumToStringMapping[val] };
                            })}
                            onChange={handleTimeModeChange}
                        />
                        <Label
                            text="Attribute"
                            labelClassName={
                                syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""
                            }
                        >
                            <Dropdown
                                options={surfaceAttributeOptions}
                                value={computedSurfaceAttribute ? computedSurfaceAttribute : ""}
                                onChange={handlePropertySurfAttributeSelectionChange}
                            />
                        </Label>

                        <Label
                            text="Tops/Zones"
                            labelClassName={
                                syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""
                            }
                        >
                            <Select
                                options={surfaceNameOptions}
                                value={computedSurfaceNames ? computedSurfaceNames : []}
                                onChange={setSelectedSurfaceNames}
                                size={5}
                                multiple
                            />
                        </Label>
                        {timeType !== SurfaceTimeType.None && (
                            <Label text={timeType === SurfaceTimeType.TimePoint ? "Time Points" : "Time Intervals"}>
                                <Select
                                    options={surfaceTimeOptions}
                                    value={computedSurfaceDates ? computedSurfaceDates : []}
                                    onChange={setSelectedSurfaceDates}
                                    size={5}
                                    multiple
                                />
                            </Label>
                        )}
                    </QueryStateWrapper>
                </>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Polygons">
                <Label
                    wrapperClassName=" flow-root mt-4 mb-2"
                    labelClassName="float-left block text-sm font-medium text-gray-700 dark:text-gray-200"
                    text={"Enable"}
                >
                    <div className=" float-right">
                        <Checkbox onChange={(e: any) => setShowPolygon(e.target.checked)} checked={showPolygon} />
                    </div>
                </Label>
                {showPolygon && (
                    <QueryStateWrapper
                        queryResult={polygonsDirectoryQuery}
                        errorComponent={"Error loading polygons directory"}
                        loadingComponent={<CircularProgress />}
                    >
                        <Label text="Stratigraphic name">
                            <>
                                <Label
                                    wrapperClassName=" flow-root"
                                    labelClassName="float-left"
                                    text={"Use surface stratigraphy"}
                                >
                                    <div className=" float-right">
                                        <Checkbox
                                            onChange={(e: any) => setLinkPolygonNameToSurfaceName(e.target.checked)}
                                            checked={linkPolygonNameToSurfaceName}
                                        />
                                    </div>
                                </Label>
                                <Select
                                    options={polyNameOptions}
                                    value={computedPolygonsName ? [computedPolygonsName] : []}
                                    onChange={handlePolyNameSelectionChange}
                                    size={5}
                                    disabled={linkPolygonNameToSurfaceName}
                                />
                            </>
                        </Label>

                        <Label text="Attribute">
                            <Select
                                options={polyAttributesOptions}
                                value={computedPolygonsAttribute ? [computedPolygonsAttribute] : []}
                                placeholder={
                                    linkPolygonNameToSurfaceName
                                        ? `No attributes found for ${computedSurfaceNames}`
                                        : `No attributes found for ${computedPolygonsName}`
                                }
                                onChange={handlePolyAttributeSelectionChange}
                                size={5}
                            />
                        </Label>
                    </QueryStateWrapper>
                )}
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Well data">
                <QueryStateWrapper
                    queryResult={wellHeadersQuery}
                    errorComponent={"Error loading wells"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Official Wells">
                        <>
                            <div>
                                <Button
                                    className="float-left m-2 text-xs py-0"
                                    variant="outlined"
                                    onClick={() => showAllWells(wellHeaderOptions)}
                                >
                                    Select all
                                </Button>
                                <Button className="m-2 text-xs py-0" variant="outlined" onClick={hideAllWells}>
                                    Select none
                                </Button>
                            </div>
                            <Select
                                options={wellHeaderOptions}
                                value={selectedWellUuids}
                                onChange={(selectedWellUuids: string[]) =>
                                    handleWellsChange(selectedWellUuids, wellHeaderOptions)
                                }
                                size={10}
                                multiple={true}
                            />
                        </>
                    </Label>
                </QueryStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Colors">
                <SurfaceColorSelector
                    initialColorPaletteId={workbenchSettings
                        .useContinuousColorScale({ gradientType: ColorScaleGradientType.Sequential })
                        .getColorPalette()
                        .getId()}
                    initialValueRange={surfaceDirectory.getMinMaxValues(null, selectedSurfaceAttribute, null)}
                    onChange={setSurfaceColorScale}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="View settings">
                <div>
                    <div className="p-2">
                        <Header text="Surface" />
                        <LabelledCheckbox
                            label="Contours"
                            checked={showContour}
                            onChange={(e: any) => setShowContour(e.target.checked)}
                        />
                        {showContour && (
                            <>
                                <Label
                                    wrapperClassName="flex flex-row"
                                    labelClassName="text-xs"
                                    text="Contour start/increment"
                                >
                                    <div className="flex justify-end space-x-2">
                                        <Input
                                            className="text-xs"
                                            type="number"
                                            value={contourStartValue}
                                            onChange={handleContourStartChange}
                                        />
                                        <Input
                                            className="text-xs"
                                            type="number"
                                            value={contourIncValue}
                                            onChange={handleContourIncChange}
                                        />
                                    </div>
                                </Label>
                            </>
                        )}
                        <LabelledCheckbox
                            label="Grid lines"
                            checked={showGrid}
                            onChange={(e: any) => setShowGrid(e.target.checked)}
                        />
                        <LabelledCheckbox
                            label="Smooth shading"
                            checked={showSmoothShading}
                            onChange={(e: any) => setShowSmoothShading(e.target.checked)}
                        />
                        <LabelledCheckbox
                            label="Material"
                            checked={showMaterial}
                            onChange={(e: any) => setShowMaterial(e.target.checked)}
                        />
                    </div>
                    <div className="p-2">
                        <Header text="View" />
                        <LabelledCheckbox
                            label="Show 3D"
                            checked={show3D}
                            onChange={(e: any) => setShow3D(e.target.checked)}
                        />
                    </div>
                </div>
            </CollapsibleGroup>
        </div>
    );
}

type PartialPolygonsSpec = {
    polygonsName: string | null;
    polygonsAttribute: string | null;
};

function fixupPolygons(
    polygonsDirectory: PolygonsDirectory,
    selectedPolygons: PartialPolygonsSpec,
    syncedPolygons: PartialPolygonsSpec
): PartialPolygonsSpec {
    const polygonsNames = polygonsDirectory.getPolygonsNames(null);
    const finalPolygonsName = fixupSyncedOrSelectedOrFirstValue(
        syncedPolygons.polygonsName,
        selectedPolygons.polygonsName,
        polygonsNames
    );
    let finalPolygonsAttribute: string | null = null;
    if (finalPolygonsName) {
        const polygonsAttributes = polygonsDirectory.getAttributeNames(finalPolygonsName);
        finalPolygonsAttribute = fixupSyncedOrSelectedOrFirstValue(
            syncedPolygons.polygonsAttribute,
            selectedPolygons.polygonsAttribute,
            polygonsAttributes
        );
    }

    return {
        polygonsName: finalPolygonsName,
        polygonsAttribute: finalPolygonsAttribute,
    };
}
function isoStringToDateLabel(input: string): string {
    const date = input.split("T")[0];
    return `${date}`;
}

function isoIntervalStringToDateLabel(input: string): string {
    const [start, end] = input.split("/");
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    return `${startDate}/${endDate}`;
}

type PartialSurfSpec = {
    surfaceAttribute: string | null;
    surfaceNames: string[];
    surfaceDates: string[];
};

function fixupSyncedOrSelectedOrFirstValue(
    syncedValue: string | null,
    selectedValue: string | null,
    values: string[]
): string | null {
    if (syncedValue && values.includes(syncedValue)) {
        return syncedValue;
    }
    if (selectedValue && values.includes(selectedValue)) {
        return selectedValue;
    }
    if (values.length) {
        return values[0];
    }
    return null;
}

function fixupSelectedSurfaceSelections(
    surfaceDirectory: SurfaceDirectory,
    syncedSurfaceAttribute: string | null,
    selectedSurfaceAttribute: string | null,
    surfaceNames: string[],
    surfaceDates: string[]
): PartialSurfSpec {
    const availableSurfaceAttributes = surfaceDirectory.getAttributeNames(null);
    const finalSurfaceAttribute = fixupSyncedOrSelectedOrFirstValue(
        syncedSurfaceAttribute,
        selectedSurfaceAttribute,
        availableSurfaceAttributes
    );
    let finalSurfaceNames: string[] | null = null;
    let finalTimeOrIntervals: string[] | null = null;
    if (!finalSurfaceAttribute) {
        return {
            surfaceNames: [],
            surfaceAttribute: null,
            surfaceDates: [],
        };
    }
    const availableSurfaceNames = surfaceDirectory.getSurfaceNames(finalSurfaceAttribute);
    const selectedSurfaceNames =
        surfaceNames?.filter((name) => availableSurfaceNames.includes(name)) ?? availableSurfaceNames;
    const availableTimeOrIntervals = surfaceDirectory.getTimeOrIntervalStrings(
        selectedSurfaceNames[0],
        finalSurfaceAttribute
    );
    const selectedTimeOrIntervals =
        surfaceDates?.filter((time) => availableTimeOrIntervals.includes(time)) ?? availableTimeOrIntervals;
    finalSurfaceNames = selectedSurfaceNames;
    finalTimeOrIntervals = selectedTimeOrIntervals;
    return {
        surfaceNames: finalSurfaceNames,
        surfaceAttribute: finalSurfaceAttribute,
        surfaceDates: finalTimeOrIntervals,
    };
}

function generateRealizationOrStatisticalAddress(
    addressFactory: SurfaceAddressFactory,
    realizationNum: number,
    aggregation: SurfaceStatisticFunction_api | null
): SurfaceAddress {
    if (aggregation === null) {
        return addressFactory.createRealizationAddress(realizationNum);
    } else {
        return addressFactory.createStatisticalAddress(aggregation);
    }
}

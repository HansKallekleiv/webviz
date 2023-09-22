import React from "react";

import { DynamicSurfaceDirectory_api, StaticSurfaceDirectory_api } from "@api";
import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import {
    SurfaceAddress,
    SurfaceAddressFactory,
    SurfaceDirectory,
    TimeType,
    useSurfaceDirectoryQuery,
} from "@modules/_shared/SurfaceDirectory";

import { MapState } from "./MapState";
import { SurfAddr, SurfAddrFactory } from "./SurfAddr";
import { AggregationDropdown } from "./UiComponents";

//-----------------------------------------------------------------------------------------------------------
export function MapSettings(props: ModuleFCProps<MapState>) {
    const myInstanceIdStr = props.moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render MapSettings`);

    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [timeType, setTimeType] = React.useState<TimeType>(TimeType.None);

    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [selectedTimeOrInterval, setSelectedTimeOrInterval] = React.useState<string | null>(null);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction_api | null>(null);

    const syncedSettingKeys = props.moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedValueSurface = syncHelper.useValue(SyncSettingKey.SURFACE, "global.syncValue.surface");
    const syncedValueDate = syncHelper.useValue(SyncSettingKey.DATE, "global.syncValue.date");

    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    const surfaceDirectoryQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    let computedSurfaceName: string | null = null;
    let computedSurfaceAttribute: string | null = null;
    let computedTimeOrInterval: string | null = null;
    const surfaceDirectory = new SurfaceDirectory({ surfaceDirectoryQueryData: surfaceDirectoryQuery.data });

    if (surfaceDirectory) {
        if (timeType == TimeType.None) {
            const computedStaticSurface = fixupStaticSurface(
                surfaceDirectory,
                { surfaceName: selectedSurfaceName, surfaceAttribute: selectedSurfaceAttribute },
                {
                    surfaceName: syncedValueSurface?.name || null,
                    surfaceAttribute: syncedValueSurface?.attribute || null,
                }
            );
            computedSurfaceName = computedStaticSurface.surfaceName;
            computedSurfaceAttribute = computedStaticSurface.surfaceAttribute;
        }

        if (timeType == TimeType.Timestamp) {
            const computedTimeStampSurface = fixupTimeStampSurface(
                surfaceDirectory,
                { surfaceName: selectedSurfaceName, surfaceAttribute: selectedSurfaceAttribute },
                {
                    surfaceName: syncedValueSurface?.name || null,
                    surfaceAttribute: syncedValueSurface?.attribute || null,
                    timeStamp: syncedValueDate?.timeOrInterval || null,
                },
                syncedValueDate?.timeOrInterval || null
            );
            computedSurfaceName = computedTimeStampSurface.surfaceName;
            computedSurfaceAttribute = computedTimeStampSurface.surfaceAttribute;
            computedTimeOrInterval = computedTimeStampSurface.timeStamp;
        }
    }
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    if (computedSurfaceName && computedSurfaceName !== selectedSurfaceName) {
        setSelectedSurfaceName(computedSurfaceName);
    }
    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }
    if (computedTimeOrInterval && computedTimeOrInterval !== selectedTimeOrInterval) {
        setSelectedTimeOrInterval(computedTimeOrInterval);
    }

    React.useEffect(function propagateSurfaceSelectionToView() {
        // console.debug("propagateSurfaceSelectionToView()");
        // console.debug(`  caseUuid=${caseUuid}`);
        // console.debug(`  ensembleName=${ensembleName}`);
        // console.debug(`  surfaceName=${surfaceName}`);
        // console.debug(`  surfaceAttribute=${surfaceAttribute}`);
        // console.debug(`  surfaceType=${surfaceType}`);
        // console.debug(`  aggregation=${aggregation}`);
        // console.debug(`  realizationNum=${realizationNum}`);
        // console.debug(`  timeOrInterval=${timeOrInterval}`);

        let surfAddr: SurfAddr | null = null;
        if (computedEnsembleIdent && computedSurfaceName && computedSurfaceAttribute) {
            const addrFactory = new SurfAddrFactory(
                computedEnsembleIdent.getCaseUuid(),
                computedEnsembleIdent.getEnsembleName(),
                computedSurfaceName,
                computedSurfaceAttribute
            );
            if (surfaceType === "dynamic" && computedTimeOrInterval) {
                if (aggregation === null) {
                    surfAddr = addrFactory.createDynamicAddr(realizationNum, computedTimeOrInterval);
                } else {
                    surfAddr = addrFactory.createStatisticalDynamicAddr(aggregation, computedTimeOrInterval);
                }
            } else if (surfaceType === "static") {
                if (aggregation === null) {
                    surfAddr = addrFactory.createStaticAddr(realizationNum);
                } else {
                    surfAddr = addrFactory.createStatisticalStaticAddr(aggregation);
                }
            }
        }

        console.debug(`propagateSurfaceSelectionToView() => ${surfAddr ? "valid surfAddr" : "NULL surfAddr"}`);
        props.moduleContext.getStateStore().setValue("surfaceAddress", surfAddr);
    });

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        console.debug("handleEnsembleSelectionChange()");
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleStaticSurfacesCheckboxChanged(event: React.ChangeEvent<HTMLInputElement>, staticChecked: boolean) {
        const newSurfType = staticChecked ? "static" : "dynamic";
        setSurfaceType(newSurfType);
    }

    function handleSurfNameSelectionChange(selectedSurfNames: string[]) {
        console.debug("handleSurfNameSelectionChange()");
        const newName = selectedSurfNames[0] ?? null;
        setSelectedSurfaceName(newName);
        if (newName && computedSurfaceAttribute) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: newName,
                attribute: computedSurfaceAttribute,
            });
        }
    }

    function handleSurfAttributeSelectionChange(selectedSurfAttributes: string[]) {
        console.debug("handleSurfAttributeSelectionChange()");
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedSurfaceAttribute(newAttr);
        if (newAttr && computedSurfaceName) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: computedSurfaceName,
                attribute: newAttr,
            });
        }
    }

    function handleTimeOrIntervalSelectionChange(selectedTimeOrIntervals: string[]) {
        console.debug("handleTimeOrIntervalSelectionChange()");
        const newTimeOrInterval = selectedTimeOrIntervals[0] ?? null;
        setSelectedTimeOrInterval(newTimeOrInterval);
        if (newTimeOrInterval) {
            syncHelper.publishValue(SyncSettingKey.DATE, "global.syncValue.date", {
                timeOrInterval: newTimeOrInterval,
            });
        }
    }

    function handleAggregationChanged(aggregation: SurfaceStatisticFunction_api | null) {
        console.debug("handleAggregationChanged()");
        setAggregation(aggregation);
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        console.debug("handleRealizationTextChanged() " + event.target.value);
        const realNum = parseInt(event.target.value, 10);
        if (realNum >= 0) {
            setRealizationNum(realNum);
        }
    }

    let surfNameOptions: SelectOption[] = [];
    let surfAttributeOptions: SelectOption[] = [];
    let timeOrIntervalOptions: SelectOption[] = [];

    if (surfaceType == "static" && staticSurfDirQuery.data) {
        const validAttrNames = getValidAttributesForSurfName(computedSurfaceName ?? "", staticSurfDirQuery.data);
        surfNameOptions = staticSurfDirQuery.data.names.map((name) => ({ value: name, label: name }));
        surfAttributeOptions = validAttrNames.map((attr) => ({ value: attr, label: attr }));
    } else if (surfaceType == "dynamic" && dynamicSurfDirQuery.data) {
        surfNameOptions = dynamicSurfDirQuery.data.names.map((name) => ({ value: name, label: name }));
        surfAttributeOptions = dynamicSurfDirQuery.data.attributes.map((attr) => ({ value: attr, label: attr }));
        timeOrIntervalOptions = dynamicSurfDirQuery.data.time_or_interval_strings.map((time) => ({
            value: time,
            label: time,
        }));
    }

    let chooseTimeOrIntervalElement: JSX.Element | null = null;
    if (surfaceType === "dynamic") {
        chooseTimeOrIntervalElement = (
            <Label
                text="Time or interval:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.DATE) ? "bg-indigo-700 text-white" : ""}
            >
                <Select
                    options={timeOrIntervalOptions}
                    value={computedTimeOrInterval ? [computedTimeOrInterval] : []}
                    onChange={handleTimeOrIntervalSelectionChange}
                    size={5}
                />
            </Label>
        );
    }

    let chooseRealizationElement: JSX.Element | null = null;
    if (aggregation === null) {
        chooseRealizationElement = (
            <Label text="Realization:">
                <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
            </Label>
        );
    }

    const activeSurfDirQuery = surfaceType == "static" ? staticSurfDirQuery : dynamicSurfDirQuery;

    return (
        <>
            <Label
                text="Ensemble:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <Checkbox
                label="Static surfaces"
                checked={surfaceType === "static"}
                onChange={handleStaticSurfacesCheckboxChanged}
            />
            <ApiStateWrapper
                apiResult={activeSurfDirQuery}
                errorComponent={"Error loading surface directory"}
                loadingComponent={<CircularProgress />}
            >
                <Label
                    text="Surface name:"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                >
                    <Select
                        options={surfNameOptions}
                        value={computedSurfaceName ? [computedSurfaceName] : []}
                        onChange={handleSurfNameSelectionChange}
                        size={5}
                    />
                </Label>
                <Label
                    text="Surface attribute:"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                >
                    <Select
                        options={surfAttributeOptions}
                        value={computedSurfaceAttribute ? [computedSurfaceAttribute] : []}
                        onChange={handleSurfAttributeSelectionChange}
                        size={5}
                    />
                </Label>
                {chooseTimeOrIntervalElement}
            </ApiStateWrapper>
            <AggregationDropdown
                selectedAggregation={aggregation}
                onAggregationSelectionChange={handleAggregationChanged}
            />
            {chooseRealizationElement}
            <div>({renderCount.current})</div>
        </>
    );
}

// Helpers
// -------------------------------------------------------------------------------------

function getValidAttributesForSurfName(surfName: string, surfDir: StaticSurfaceDirectory_api): string[] {
    const idxOfSurfName = surfDir.names.indexOf(surfName);
    if (idxOfSurfName == -1) {
        return [];
    }

    const attrIndices = surfDir.valid_attributes_for_name[idxOfSurfName];
    const attrNames: string[] = [];
    for (const idx of attrIndices) {
        attrNames.push(surfDir.attributes[idx]);
    }

    return attrNames;
}

function fixupStringValueFromList(currValue: string | null, legalValues: string[] | null): string | null {
    if (!legalValues || legalValues.length == 0) {
        return null;
    }
    if (currValue && legalValues.includes(currValue)) {
        return currValue;
    }

    return legalValues[0];
}

function fixupStaticSurfAttribute(
    surfName: string | null,
    currAttribute: string | null,
    surfDir: StaticSurfaceDirectory_api
): string | null {
    if (!surfName) {
        return null;
    }
    const validAttrNames = getValidAttributesForSurfName(surfName, surfDir);
    if (validAttrNames.length == 0) {
        return null;
    }

    if (currAttribute && validAttrNames.includes(currAttribute)) {
        return currAttribute;
    }

    return validAttrNames[0];
}

function isValidStaticSurf(
    surfName: string | null,
    surfAttribute: string | null,
    surfDir: StaticSurfaceDirectory_api
): boolean {
    if (!surfName || !surfAttribute) {
        return false;
    }

    const validAttrNames = getValidAttributesForSurfName(surfName, surfDir);
    if (validAttrNames.length == 0) {
        return false;
    }

    if (!validAttrNames.includes(surfAttribute)) {
        return false;
    }

    return true;
}

function isValidDynamicSurf(
    surfName: string | null,
    surfAttribute: string | null,
    surfDir: DynamicSurfaceDirectory_api
): boolean {
    if (!surfName || !surfAttribute) {
        return false;
    }

    if (!surfDir.names.includes(surfName)) {
        return false;
    }
    if (!surfDir.attributes.includes(surfAttribute)) {
        return false;
    }

    return true;
}

function isValidDynamicSurfTimeOrInterval(
    timeOrInterval: string | null,
    surfDir: DynamicSurfaceDirectory_api
): boolean {
    if (!timeOrInterval || !surfDir) {
        return false;
    }

    if (!surfDir.time_or_interval_strings.includes(timeOrInterval)) {
        return false;
    }

    return true;
}

function fixupStaticSurface(
    surfaceDirectory: SurfaceDirectory,
    selectedSurface: { surfaceName: string | null; surfaceAttribute: string | null },
    syncedSurface: { surfaceName: string | null; surfaceAttribute: string | null }
): { surfaceName: string | null; surfaceAttribute: string | null } {
    const surfaceNames = surfaceDirectory.getStratigraphicNames(TimeType.None, null);
    let finalSurfaceName: string | null = null;
    let finalSurfaceAttribute: string | null = null;
    finalSurfaceName = fixupSyncedOrSelectedOrFirstValue(
        syncedSurface.surfaceName,
        selectedSurface.surfaceName,
        surfaceNames
    );

    if (finalSurfaceName) {
        const surfaceAttributes = surfaceDirectory.getAttributeNames(TimeType.None, finalSurfaceName);
        finalSurfaceAttribute = fixupSyncedOrSelectedOrFirstValue(
            syncedSurface.surfaceAttribute,
            selectedSurface.surfaceAttribute,
            surfaceAttributes
        );
    }
    return { surfaceName: finalSurfaceName, surfaceAttribute: finalSurfaceAttribute };
}
function fixupTimeStampSurface(
    surfaceDirectory: SurfaceDirectory,
    selectedSurface: { surfaceName: string | null; surfaceAttribute: string | null },
    syncedSurface: { surfaceName: string | null; surfaceAttribute: string | null; timeStamp: string | null },
    selectedTimeStamp: string | null
): { surfaceName: string | null; surfaceAttribute: string | null; timeStamp: string | null } {
    const surfaceNames = surfaceDirectory.getStratigraphicNames(TimeType.Timestamp, null);
    let finalSurfaceName = fixupSyncedOrSelectedOrFirstValue(
        syncedSurface.surfaceName,
        selectedSurface.surfaceName,
        surfaceNames
    );
    let finalSurfaceAttribute: string | null = null;
    let finalTimeOrInterval: string | null = null;
    if (finalSurfaceName) {
        const surfaceAttributes = surfaceDirectory.getAttributeNames(TimeType.Timestamp, finalSurfaceName);
        finalSurfaceAttribute = fixupSyncedOrSelectedOrFirstValue(
            syncedSurface.surfaceAttribute,
            selectedSurface.surfaceAttribute,
            surfaceAttributes
        );
    }
    if (finalSurfaceName && finalSurfaceAttribute) {
        const timeStamps = surfaceDirectory.getTimeStamps(finalSurfaceName, finalSurfaceAttribute);
        finalTimeOrInterval = fixupSyncedOrSelectedOrFirstValue(syncedSurface.timeStamp, selectedTimeStamp, timeStamps);
    }
    return { surfaceName: finalSurfaceName, surfaceAttribute: finalSurfaceAttribute, timeStamp: finalTimeOrInterval };
}

function fixupTimeIntervalSurface(
    surfaceDirectory: SurfaceDirectory,
    selectedSurface: {
        surfaceName: string | null;
        surfaceAttribute: string | null;
    },
    syncedSurface: { surfaceName: string | null; surfaceAttribute: string | null; timeInterval: string | null },
    selectedTimeInterval: string | null
): { surfaceName: string | null; surfaceAttribute: string | null; timeInterval: string | null } {
    const surfaceNames = surfaceDirectory.getStratigraphicNames(TimeType.Interval, null);
    let finalSurfaceName = fixupSyncedOrSelectedOrFirstValue(
        syncedSurface.surfaceName,
        selectedSurface.surfaceName,
        surfaceNames
    );
    let finalSurfaceAttribute: string | null = null;
    let finalTimeOrInterval: string | null = null;
    if (finalSurfaceName) {
        const surfaceAttributes = surfaceDirectory.getAttributeNames(TimeType.Interval, finalSurfaceName);
        finalSurfaceAttribute = fixupSyncedOrSelectedOrFirstValue(
            syncedSurface.surfaceAttribute,
            selectedSurface.surfaceAttribute,
            surfaceAttributes
        );
    }
    if (finalSurfaceName && finalSurfaceAttribute) {
        const timeIntervals = surfaceDirectory.getTimeIntervals(finalSurfaceName, finalSurfaceAttribute);
        finalTimeOrInterval = fixupSyncedOrSelectedOrFirstValue(
            syncedSurface.timeInterval,
            selectedTimeInterval,
            timeIntervals
        );
    }
    return {
        surfaceName: finalSurfaceName,
        surfaceAttribute: finalSurfaceAttribute,
        timeInterval: finalTimeOrInterval,
    };
}

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

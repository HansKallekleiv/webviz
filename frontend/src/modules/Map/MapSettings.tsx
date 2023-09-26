import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import {
    SurfaceAddress,
    SurfaceAddressFactory,
    SurfaceDirectory,
    TimeType,
    useSurfaceDirectoryQuery,
} from "@modules/_shared/Surface";

import { MapState } from "./MapState";
import { AggregationDropdown } from "./UiComponents";

const TimeTypeEnumToStringMapping = {
    [TimeType.None]: "Static",
    [TimeType.Timestamp]: "Time stamp",
    [TimeType.Interval]: "Time interval",
};
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
    const surfaceDirectory = new SurfaceDirectory(
        surfaceDirectoryQuery.data ? { surfaceMetas: surfaceDirectoryQuery.data, timeType: timeType } : null
    );

    if (surfaceDirectory) {
        const computedSurface = fixupSurface(
            surfaceDirectory,
            {
                surfaceName: selectedSurfaceName,
                surfaceAttribute: selectedSurfaceAttribute,
                timeOrInterval: selectedTimeOrInterval,
            },
            {
                surfaceName: syncedValueSurface?.name || null,
                surfaceAttribute: syncedValueSurface?.attribute || null,
                timeOrInterval: syncedValueDate?.timeOrInterval || null,
            }
        );
        computedSurfaceName = computedSurface.surfaceName;
        computedSurfaceAttribute = computedSurface.surfaceAttribute;
        computedTimeOrInterval = computedSurface.timeOrInterval;
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
        let surfaceAddress: SurfaceAddress | null = null;
        if (computedEnsembleIdent && computedSurfaceName && computedSurfaceAttribute) {
            const addrFactory = new SurfaceAddressFactory(
                computedEnsembleIdent.getCaseUuid(),
                computedEnsembleIdent.getEnsembleName(),
                computedSurfaceName,
                computedSurfaceAttribute,
                computedTimeOrInterval
            );
            if (aggregation === null) {
                surfaceAddress = addrFactory.createRealizationAddress(realizationNum);
            } else {
                surfaceAddress = addrFactory.createStatisticalAddress(aggregation);
            }
        }

        console.debug(`propagateSurfaceSelectionToView() => ${surfaceAddress ? "valid surfAddr" : "NULL surfAddr"}`);
        props.moduleContext.getStateStore().setValue("surfaceAddress", surfaceAddress);
    });

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        console.debug("handleEnsembleSelectionChange()");
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
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

    function handleTimeOrIntervalSelectionChange(selectedSurfTimeIntervals: string[]) {
        console.debug("handleTimeOrIntervalSelectionChange()");
        const newTimeOrInterval = selectedSurfTimeIntervals[0] ?? null;
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
    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeType(event.target.value as TimeType);
    }
    let surfNameOptions: SelectOption[] = [];
    let surfAttributeOptions: SelectOption[] = [];
    let timeOrIntervalOptions: SelectOption[] = [];

    if (surfaceDirectory) {
        surfNameOptions = surfaceDirectory.getStratigraphicNames(null).map((name) => ({
            value: name,
            label: name,
        }));
        surfAttributeOptions = surfaceDirectory.getAttributeNames(computedSurfaceName).map((attr) => ({
            value: attr,
            label: attr,
        }));

        if (timeType === TimeType.Interval || timeType === TimeType.Timestamp) {
            timeOrIntervalOptions = surfaceDirectory
                .getTimeStampsOrIntervals(computedSurfaceName, computedSurfaceAttribute)
                .map((interval) => ({
                    value: interval,
                    label:
                        timeType === TimeType.Timestamp
                            ? IsoStringToDateLabel(interval)
                            : IsoIntervalStringToDateLabel(interval),
                }));
        }
    }

    let chooseRealizationElement: JSX.Element | null = null;
    if (aggregation === null) {
        chooseRealizationElement = (
            <Label text="Realization:">
                <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
            </Label>
        );
    }

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
            <RadioGroup
                value={timeType}
                options={Object.values(TimeType).map((val: TimeType) => {
                    return { value: val, label: TimeTypeEnumToStringMapping[val] };
                })}
                onChange={handleTimeModeChange}
            />
            <ApiStateWrapper
                apiResult={surfaceDirectoryQuery}
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
                {timeType !== TimeType.None && (
                    <Label text={timeType === TimeType.Timestamp ? "Time Stamp" : "Time Interval"}>
                        <Select
                            options={timeOrIntervalOptions}
                            value={computedTimeOrInterval ? [computedTimeOrInterval] : []}
                            onChange={handleTimeOrIntervalSelectionChange}
                            size={5}
                        />
                    </Label>
                )}
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

function fixupSurface(
    surfaceDirectory: SurfaceDirectory,
    selectedSurface: { surfaceName: string | null; surfaceAttribute: string | null; timeOrInterval: string | null },
    syncedSurface: { surfaceName: string | null; surfaceAttribute: string | null; timeOrInterval: string | null }
): { surfaceName: string | null; surfaceAttribute: string | null; timeOrInterval: string | null } {
    const surfaceNames = surfaceDirectory.getStratigraphicNames(null);
    const finalSurfaceName = fixupSyncedOrSelectedOrFirstValue(
        syncedSurface.surfaceName,
        selectedSurface.surfaceName,
        surfaceNames
    );
    let finalSurfaceAttribute: string | null = null;
    let finalTimeOrInterval: string | null = null;
    if (finalSurfaceName) {
        const surfaceAttributes = surfaceDirectory.getAttributeNames(finalSurfaceName);
        finalSurfaceAttribute = fixupSyncedOrSelectedOrFirstValue(
            syncedSurface.surfaceAttribute,
            selectedSurface.surfaceAttribute,
            surfaceAttributes
        );
    }
    if (finalSurfaceName && finalSurfaceAttribute) {
        const selectedTimeOrIntervals = surfaceDirectory.getTimeStampsOrIntervals(
            finalSurfaceName,
            finalSurfaceAttribute
        );
        finalTimeOrInterval = fixupSyncedOrSelectedOrFirstValue(
            syncedSurface.timeOrInterval,
            selectedSurface.timeOrInterval,
            selectedTimeOrIntervals
        );
    }
    return {
        surfaceName: finalSurfaceName,
        surfaceAttribute: finalSurfaceAttribute,
        timeOrInterval: finalTimeOrInterval,
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
export function IsoStringToDateLabel(input: string): string {
    const date = input.split("T")[0];
    return `${date}`;
}

export function IsoIntervalStringToDateLabel(input: string): string {
    const [start, end] = input.split("/");
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    return `${startDate}/${endDate}`;
}

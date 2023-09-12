import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Label } from "@lib/components/Label";
import { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SurfAddr } from "@modules/TopographicMap/SurfaceAddress";
import { CircularProgress } from "@mui/material";

import { useSurfaceDirectoryQuery } from "./queryHooks";
import { SurfaceDirectory, TimeType } from "./surfaceDirectory";

export interface EnsembleSurfaceAddress {
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    timeType: TimeType;
    timeString?: string;
}

export interface SurfaceSelectProps {
    ensembleIdent: EnsembleIdent | null;
    surfaceAddress?: SurfAddr | null;
    setSurfaceAddress?: React.Dispatch<React.SetStateAction<EnsembleSurfaceAddress | null>>;
    includeAttributeTypes?: SurfaceAttributeType_api[] | null;
    excludeAttributeTypes?: SurfaceAttributeType_api[] | null;
    timeType: TimeType;
    observed?: boolean;
    moduleContext: ModuleContext<any>;
    workbenchServices: WorkbenchServices;
}

export function SurfaceSelect(props: SurfaceSelectProps): JSX.Element {
    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const [selectedTimeStamp, setSelectedTimeStamp] = React.useState<string | null>(null);
    const [selectedTimeInterval, setSelectedTimeInterval] = React.useState<string | null>(null);

    const syncedSettingKeys = props.moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const surfaceDirectoryQuery = useSurfaceDirectoryQuery(
        props.ensembleIdent?.getCaseUuid(),
        props.ensembleIdent?.getEnsembleName()
    );

    const surfaceDirectory = new SurfaceDirectory({
        surfaceDirectoryQueryData: surfaceDirectoryQuery?.data,
        includeAttributeTypes: props.includeAttributeTypes,
        excludeAttributeTypes: props.excludeAttributeTypes,
        useObservedSurfaces: props.observed,
    });

    const surfaceNames = surfaceDirectory.getStratigraphicNames(props.timeType, null);
    const computedSurfaceName =
        selectedSurfaceName && surfaceNames.includes(selectedSurfaceName) ? selectedSurfaceName : surfaceNames[0];
    if (computedSurfaceName && computedSurfaceName !== selectedSurfaceName) {
        setSelectedSurfaceName(computedSurfaceName);
    }

    const surfaceAttributes = surfaceDirectory.getAttributeNames(props.timeType, computedSurfaceName);
    const computedSurfaceAttribute =
        selectedSurfaceAttribute && surfaceAttributes.includes(selectedSurfaceAttribute)
            ? selectedSurfaceAttribute
            : surfaceAttributes[0];
    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }

    const surfaceTimeStamps = surfaceDirectory.getTimeStamps(computedSurfaceName, computedSurfaceAttribute);
    const computedTimeStamp =
        selectedTimeStamp && surfaceTimeStamps.includes(selectedTimeStamp) ? selectedTimeStamp : surfaceTimeStamps[0];
    if (computedTimeStamp && computedTimeStamp !== selectedTimeStamp) {
        setSelectedTimeStamp(computedTimeStamp);
    }

    const surfaceTimeIntervals = surfaceDirectory.getTimeIntervals(computedSurfaceName, computedSurfaceAttribute);
    const computedTimeInterval =
        selectedTimeInterval && surfaceTimeIntervals.includes(selectedTimeInterval)
            ? selectedTimeInterval
            : surfaceTimeIntervals[0];
    if (computedTimeInterval && computedTimeInterval !== selectedTimeInterval) {
        setSelectedTimeInterval(computedTimeInterval);
    }
    React.useEffect(
        function propagateMeshSurfaceSelectionToView() {
            let surfAddr: EnsembleSurfaceAddress | null = null;

            if (props.ensembleIdent && computedSurfaceName && computedSurfaceAttribute) {
                if (props.timeType === TimeType.Timestamp && computedTimeStamp)
                    surfAddr = {
                        caseUuid: props.ensembleIdent.getCaseUuid(),
                        ensemble: props.ensembleIdent.getEnsembleName(),
                        name: computedSurfaceName,
                        attribute: computedSurfaceAttribute,
                        timeType: props.timeType,
                        timeString: computedTimeStamp,
                    };
                else if (props.timeType === TimeType.Interval && computedTimeInterval)
                    surfAddr = {
                        caseUuid: props.ensembleIdent.getCaseUuid(),
                        ensemble: props.ensembleIdent.getEnsembleName(),
                        name: computedSurfaceName,
                        attribute: computedSurfaceAttribute,
                        timeType: props.timeType,
                        timeString: computedTimeInterval,
                    };
                else if (props.timeType === TimeType.None)
                    surfAddr = {
                        caseUuid: props.ensembleIdent.getCaseUuid(),
                        ensemble: props.ensembleIdent.getEnsembleName(),
                        name: computedSurfaceName,
                        attribute: computedSurfaceAttribute,
                        timeType: props.timeType,
                    };
                else {
                    surfAddr = null;
                }
            } else {
                surfAddr = null;
            }
            props.setSurfaceAddress?.(surfAddr);
        },
        [selectedSurfaceName, selectedSurfaceAttribute, selectedTimeStamp, selectedTimeInterval]
    );
    let SurfNameOptions: SelectOption[] = [];
    let SurfAttributeOptions: SelectOption[] = [];
    let SurfTimeStampOptions: SelectOption[] = [];
    let SurfTimeIntervalOptions: SelectOption[] = [];
    SurfNameOptions = surfaceNames.map((name) => ({
        value: name,
        label: name,
    }));
    SurfAttributeOptions = surfaceAttributes.map((attr) => ({
        value: attr,
        label: attr,
    }));
    SurfTimeStampOptions = surfaceTimeStamps.map((timestamp) => ({
        value: timestamp,
        label: timestamp,
    }));
    SurfTimeIntervalOptions = surfaceTimeIntervals.map((timeInterval) => ({
        value: timeInterval,
        label: timeInterval,
    }));

    console.log(surfaceDirectory.getMinMax(computedSurfaceName, computedSurfaceAttribute, props.timeType));
    function handleSurfNameSelectionChange(selectedSurfNames: string[]) {
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
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedSurfaceAttribute(newAttr);
    }
    function handleSurfTimeStampSelectionChange(selectedSurfTimeStamps: string[]) {
        const newTimeStamp = selectedSurfTimeStamps[0] ?? null;
        setSelectedTimeStamp(newTimeStamp);
    }
    function handleSurfTimeIntervalSelectionChange(selectedSurfTimeIntervals: string[]) {
        const newTimeInterval = selectedSurfTimeIntervals[0] ?? null;
        setSelectedTimeInterval(newTimeInterval);
    }
    return (
        <ApiStateWrapper
            apiResult={surfaceDirectoryQuery}
            errorComponent={"Error loading surface directory"}
            loadingComponent={<CircularProgress />}
        >
            <>
                <Label
                    text="Stratigraphic name"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                >
                    <Select
                        options={SurfNameOptions}
                        value={computedSurfaceName ? [computedSurfaceName] : []}
                        onChange={handleSurfNameSelectionChange}
                        size={5}
                    />
                </Label>
                <Label text="Attribute">
                    <Select
                        options={SurfAttributeOptions}
                        value={computedSurfaceAttribute ? [computedSurfaceAttribute] : []}
                        onChange={handleSurfAttributeSelectionChange}
                        size={5}
                    />
                </Label>
                {props.timeType === TimeType.Timestamp && (
                    <Label text="Time Stamp">
                        <Select
                            options={SurfTimeStampOptions}
                            value={computedTimeStamp ? [computedTimeStamp] : []}
                            onChange={handleSurfTimeStampSelectionChange}
                            size={5}
                        />
                    </Label>
                )}
                {props.timeType === TimeType.Interval && (
                    <Label text="Time Interval">
                        <Select
                            options={SurfTimeIntervalOptions}
                            value={computedTimeInterval ? [computedTimeInterval] : []}
                            onChange={handleSurfTimeIntervalSelectionChange}
                            size={5}
                        />
                    </Label>
                )}
            </>
        </ApiStateWrapper>
    );
}

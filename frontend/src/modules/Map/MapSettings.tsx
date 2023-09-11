import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Checkbox } from "@lib/components/Checkbox";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { EnsembleSurfaceAddress, SurfaceSelect, TimeType } from "@modules/TopographicMap/components/SurfaceSelect";

import { MapState } from "./MapState";
import { SurfAddr, SurfAddrFactory } from "./SurfAddr";
import { AggregationDropdown } from "./UiComponents";

export const TimeTypeEnumToStringMapping = {
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
    const [ensembleSurfaceAddress, setEnsembleSurfaceAddress] = React.useState<EnsembleSurfaceAddress | null>(null);
    const [realizationNum, setRealizationNum] = React.useState<number>(0);
    const [aggregation, setAggregation] = React.useState<SurfaceStatisticFunction_api | null>(null);
    const [showObserved, setShowObserved] = React.useState<boolean>(false);

    const syncedSettingKeys = props.moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);

    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    React.useEffect(function propagateSurfaceSelectionToView() {
        let surfAddr: SurfAddr | null = null;
        if (ensembleSurfaceAddress) {
            const addrFactory = new SurfAddrFactory(
                ensembleSurfaceAddress.caseUuid,
                ensembleSurfaceAddress.ensemble,
                ensembleSurfaceAddress.name,
                ensembleSurfaceAddress.attribute
            );
            if (
                ensembleSurfaceAddress.timeString &&
                (timeType === TimeType.Timestamp || timeType === TimeType.Interval)
            ) {
                if (aggregation === null) {
                    surfAddr = addrFactory.createDynamicAddr(realizationNum, ensembleSurfaceAddress.timeString);
                } else {
                    surfAddr = addrFactory.createStatisticalDynamicAddr(aggregation, ensembleSurfaceAddress.timeString);
                }
            } else if (timeType === TimeType.None) {
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

    let chooseRealizationElement: JSX.Element | null = null;
    if (aggregation === null) {
        chooseRealizationElement = (
            <Label text="Realization:">
                <Input type={"number"} value={realizationNum} onChange={handleRealizationTextChanged} />
            </Label>
        );
    }

    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeType(event.target.value as TimeType);
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
            <Label labelClassName="float-left  me-4" text={"Show observed surfaces"}>
                <Checkbox onChange={(e: any) => setShowObserved(e.target.checked)} checked={showObserved} />
            </Label>

            <SurfaceSelect
                ensembleIdent={computedEnsembleIdent}
                timeType={timeType}
                setSurfaceAddress={setEnsembleSurfaceAddress}
                observed={showObserved}
                moduleContext={props.moduleContext}
                workbenchServices={props.workbenchServices}
            />

            <AggregationDropdown
                selectedAggregation={aggregation}
                onAggregationSelectionChange={handleAggregationChanged}
            />
            {chooseRealizationElement}
            <div>({renderCount.current})</div>
        </>
    );
}

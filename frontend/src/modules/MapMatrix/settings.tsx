import React from "react";

import { SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { TimeType } from "@modules/_shared/Surface";

import { v4 as uuidv4 } from "uuid";

import { SingleSelect } from "./components/singleSelect";
import { SurfaceSelect } from "./components/surfaceSelect";
import { SyncSettings } from "./components/syncSettings";
import { useEnsembleSetSurfaceMetaQuery } from "./hooks/useEnsembleSetSurfaceMetaQuery";
import { useSurfaceReducer } from "./hooks/useSurfaceReducer";
import { State } from "./state";
import { EnsembleStageType, SurfaceSpecification, SyncedSettings } from "./types";

const TimeTypeEnumToStringMapping = {
    [TimeType.None]: "Static",
    [TimeType.TimePoint]: "Time point",
    [TimeType.Interval]: "Time interval",
};

export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(
        ensembleSet.getEnsembleArr().map((ens) => ens.getIdent())
    );
    const {
        state,
        addSurface,
        removeSurface,
        setSurfaceSpecification,
        setAttributeType,
        setSyncedSettings,
        setTimeMode,
    } = useSurfaceReducer();

    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeMode(event.target.value as TimeType);
    }

    function handleSurfaceAttributeTypeChange(val: string) {
        setAttributeType(val as SurfaceAttributeType_api);
    }

    function handleSyncedSettingsChange(syncedSettings: SyncedSettings) {
        setSyncedSettings(syncedSettings);
    }
    function handleAddSurface() {
        let newSurface: SurfaceSpecification = {
            ensembleIdent: ensembleSet.getEnsembleArr()[0]?.getIdent() ?? null,
            surfaceName: null,
            surfaceAttribute: null,
            surfaceTimeOrInterval: null,
            realizationNum: null,
            uuid: uuidv4(),
            statisticFunction: SurfaceStatisticFunction_api.MEAN,
            ensembleStage: EnsembleStageType.Realization,
            colorMin: 0,
            colorMax: 0,
        };

        if (state.surfaceSpecifications.length) {
            newSurface = { ...state.surfaceSpecifications[state.surfaceSpecifications.length - 1], uuid: uuidv4() };
        }
        addSurface(newSurface);
    }
    function handleSurfaceSelectChange(surfaceSpecification: SurfaceSpecification) {
        setSurfaceSpecification(surfaceSpecification);
    }
    function handleRemoveSurface(uuid: string) {
        removeSurface(uuid);
    }
    React.useEffect(
        function propogateSurfaceSpecificationsToView() {
            moduleContext.getStateStore().setValue("surfaceSpecifications", state.surfaceSpecifications);
        },
        [state.surfaceSpecifications]
    );
    return (
        <>
            <Label text="Time mode">
                <RadioGroup
                    value={state.timeMode}
                    direction="horizontal"
                    options={Object.values(TimeType).map((val: TimeType) => {
                        return { value: val, label: TimeTypeEnumToStringMapping[val] };
                    })}
                    onChange={handleTimeModeChange}
                />
            </Label>
            <CollapsibleGroup expanded={false} title="Attribute type filter">
                <SingleSelect
                    name={"Surface attribute types"}
                    options={Object.values(SurfaceAttributeType_api)}
                    onChange={handleSurfaceAttributeTypeChange}
                    size={5}
                />
            </CollapsibleGroup>

            <CollapsibleGroup expanded={true} title="Synchronization">
                <SyncSettings syncedSettings={state.syncedSettings} onChange={handleSyncedSettingsChange} />
            </CollapsibleGroup>
            <div className="m-2">
                <Button
                    variant={"contained"}
                    onClick={handleAddSurface}
                    disabled={ensembleSetSurfaceMetas.isFetching}
                    startIcon={ensembleSetSurfaceMetas.isFetching ? <CircularProgress /> : null}
                >
                    Add Surface
                </Button>
            </div>
            <table className="table-auto w-full divide-y divide-gray-200">
                <tbody>
                    {state.surfaceSpecifications.map((surfaceSpec, index) => (
                        <SurfaceSelect
                            index={index}
                            key={surfaceSpec.uuid}
                            surfaceMetas={ensembleSetSurfaceMetas}
                            surfaceSpecification={surfaceSpec}
                            ensembleSet={ensembleSet}
                            timeType={state.timeMode}
                            attributeType={state.attributeType}
                            syncedSettings={state.syncedSettings}
                            onChange={handleSurfaceSelectChange}
                            onRemove={handleRemoveSurface}
                        />
                    ))}
                </tbody>
            </table>
        </>
    );
}

import React from "react";

import { SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { TimeType } from "@modules/_shared/Surface";

import { v4 as uuidv4 } from "uuid";

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
const ColorScaleGradientTypeToStringMapping = {
    [ColorScaleGradientType.Sequential]: "Sequential",
    [ColorScaleGradientType.Diverging]: "Diverging",
};
export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(
        ensembleSet.getEnsembleArr().map((ens) => ens.getIdent())
    );
    const surfaceReducer = useSurfaceReducer();

    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        surfaceReducer.setTimeMode(event.target.value as TimeType);
    }

    function handleSurfaceAttributeTypeChange(val: string) {
        const newSurfaceAttributeType = val as SurfaceAttributeType_api;
        if (newSurfaceAttributeType === SurfaceAttributeType_api.DEPTH) {
            surfaceReducer.setTimeMode(TimeType.None);
        }
        surfaceReducer.setAttributeType(newSurfaceAttributeType);
    }

    function handleSyncedSettingsChange(syncedSettings: SyncedSettings) {
        surfaceReducer.setSyncedSettings(syncedSettings);
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

        if (surfaceReducer.state.surfaceSpecifications.length) {
            newSurface = {
                ...surfaceReducer.state.surfaceSpecifications[surfaceReducer.state.surfaceSpecifications.length - 1],
                uuid: uuidv4(),
            };
        }
        surfaceReducer.addSurface(newSurface);
    }
    function handleSurfaceSelectChange(surfaceSpecification: SurfaceSpecification) {
        surfaceReducer.setSurface(surfaceSpecification);
    }
    function handleRemoveSurface(uuid: string) {
        surfaceReducer.removeSurface(uuid);
    }
    function handleColorScaleGradientTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        console.log(event.target.value);
        surfaceReducer.SetColorScaleGradientType(event.target.value as ColorScaleGradientType);
    }
    React.useEffect(
        function propogateSurfaceSpecificationsToView() {
            moduleContext.getStateStore().setValue("surfaceSpecifications", surfaceReducer.state.surfaceSpecifications);
        },
        [surfaceReducer.state.surfaceSpecifications]
    );
    React.useEffect(
        function propogateColorPaletteTypeToView() {
            moduleContext
                .getStateStore()
                .setValue("colorScaleGradientType", surfaceReducer.state.colorScaleGradientType);
        },
        [surfaceReducer.state.colorScaleGradientType]
    );
    return (
        <>
            <Label text="Time mode">
                <RadioGroup
                    value={surfaceReducer.state.timeMode}
                    direction="horizontal"
                    options={Object.values(TimeType).map((val: TimeType) => {
                        return { value: val, label: TimeTypeEnumToStringMapping[val] };
                    })}
                    disabled={surfaceReducer.state.attributeType === SurfaceAttributeType_api.DEPTH}
                    onChange={handleTimeModeChange}
                />
            </Label>
            <Label text="Surface attribute type">
                <Dropdown
                    options={Object.values(SurfaceAttributeType_api).map((val: SurfaceAttributeType_api) => {
                        return { value: val, label: val };
                    })}
                    onChange={handleSurfaceAttributeTypeChange}
                    value={surfaceReducer.state.attributeType}
                />
            </Label>
            <Label text="Color palette">
                <RadioGroup
                    value={surfaceReducer.state.colorScaleGradientType}
                    direction="horizontal"
                    options={Object.values(ColorScaleGradientType).map((val: ColorScaleGradientType) => {
                        return { value: val, label: ColorScaleGradientTypeToStringMapping[val] };
                    })}
                    onChange={handleColorScaleGradientTypeChange}
                />
            </Label>

            <CollapsibleGroup expanded={true} title="Synchronization">
                <SyncSettings
                    syncedSettings={surfaceReducer.state.syncedSettings}
                    onChange={handleSyncedSettingsChange}
                />
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
                    {surfaceReducer.state.surfaceSpecifications.map((surfaceSpec, index) => (
                        <SurfaceSelect
                            index={index}
                            key={surfaceSpec.uuid}
                            surfaceMetas={ensembleSetSurfaceMetas}
                            surfaceSpecification={surfaceSpec}
                            ensembleSet={ensembleSet}
                            timeType={surfaceReducer.state.timeMode}
                            attributeType={surfaceReducer.state.attributeType}
                            syncedSettings={surfaceReducer.state.syncedSettings}
                            onChange={handleSurfaceSelectChange}
                            onRemove={handleRemoveSurface}
                        />
                    ))}
                </tbody>
            </table>
        </>
    );
}

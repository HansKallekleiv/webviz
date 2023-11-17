import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";

import { v4 as uuidv4 } from "uuid";

import { SurfaceAttributeTypeSelect } from "./components/surfaceAttributeTypeSelect";
import { SurfaceColorSelect } from "./components/surfaceColorSelect";
import { SurfaceSelect } from "./components/surfaceSelect";
import { SyncSettings } from "./components/syncSettings";
import { useEnsembleSetSurfaceMetaQuery } from "./hooks/useEnsembleSetSurfaceMetaQuery";
import { useSurfaceReducer } from "./hooks/useSurfaceReducer";
import { State } from "./state";
import { EnsembleStageType, SurfaceSpecification, SyncedSettings } from "./types";

export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const reducer = useSurfaceReducer();

    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(reducer.state.ensembleIdents);

    function handleSyncedSettingsChange(syncedSettings: SyncedSettings) {
        reducer.setSyncedSettings(syncedSettings);
    }
    function handleAddSurface() {
        let newSurface: SurfaceSpecification = {
            ensembleIdent: null,
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

        if (reducer.state.surfaceSpecifications.length) {
            newSurface = {
                ...reducer.state.surfaceSpecifications[reducer.state.surfaceSpecifications.length - 1],
                uuid: newSurface.uuid,
            };
        }
        reducer.addSurface(newSurface);
    }
    function handleSurfaceSelectChange(surfaceSpecification: SurfaceSpecification) {
        reducer.setSurface(surfaceSpecification);
    }
    function handleRemoveSurface(uuid: string) {
        reducer.removeSurface(uuid);
    }

    React.useEffect(
        function propogateSurfaceSpecificationsToView() {
            moduleContext.getStateStore().setValue("surfaceSpecifications", reducer.state.surfaceSpecifications);
        },
        [reducer.state.surfaceSpecifications]
    );
    React.useEffect(
        function propogateColorPaletteTypeToView() {
            moduleContext.getStateStore().setValue("colorScaleGradientType", reducer.state.colorScaleGradientType);
        },
        [reducer.state.colorScaleGradientType]
    );

    return (
        <>
            <CollapsibleGroup expanded={true} title="Ensembles">
                Only the intersection of surfaces in the selected ensembles will be shown.
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={reducer.state.ensembleIdents}
                    onChange={reducer.setEnsembleIdents}
                    size={4}
                />
            </CollapsibleGroup>
            <SurfaceAttributeTypeSelect
                onAttributeChange={reducer.setAttributeType}
                onTimeModeChange={reducer.setTimeMode}
                timeMode={reducer.state.timeMode}
                attributeType={reducer.state.attributeType}
            />

            <CollapsibleGroup expanded={true} title="Colors">
                <SurfaceColorSelect
                    colorScaleGradientType={reducer.state.colorScaleGradientType}
                    onColorGradientTypeChange={reducer.setColorScaleGradientType}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Synchronization">
                <SyncSettings syncedSettings={reducer.state.syncedSettings} onChange={handleSyncedSettingsChange} />
            </CollapsibleGroup>
            <div className="m-2">
                <Button
                    variant={"contained"}
                    onClick={handleAddSurface}
                    disabled={ensembleSetSurfaceMetas.isFetching && ensembleSet.getEnsembleArr().length > 0}
                    startIcon={ensembleSetSurfaceMetas.isFetching ? <CircularProgress /> : null}
                >
                    Add Surface
                </Button>
            </div>
            <table className="table-auto w-full divide-y divide-gray-200">
                <tbody>
                    {reducer.state.surfaceSpecifications.map((surfaceSpec, index) => (
                        <SurfaceSelect
                            index={index}
                            key={surfaceSpec.uuid}
                            surfaceMetas={ensembleSetSurfaceMetas}
                            surfaceSpecification={surfaceSpec}
                            ensembleIdents={reducer.state.ensembleIdents}
                            timeType={reducer.state.timeMode}
                            attributeType={reducer.state.attributeType}
                            syncedSettings={reducer.state.syncedSettings}
                            onChange={handleSurfaceSelectChange}
                            onRemove={handleRemoveSurface}
                            ensembleSet={ensembleSet}
                        />
                    ))}
                </tbody>
            </table>
        </>
    );
}

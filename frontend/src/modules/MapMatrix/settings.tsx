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
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(
        ensembleSet.getEnsembleArr().map((ens) => ens.getIdent())
    );
    const surfaceReducer = useSurfaceReducer();

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
            <SurfaceAttributeTypeSelect
                onAttributeChange={surfaceReducer.setAttributeType}
                onTimeModeChange={surfaceReducer.setTimeMode}
                timeMode={surfaceReducer.state.timeMode}
                attributeType={surfaceReducer.state.attributeType}
            />

            <CollapsibleGroup expanded={true} title="Colors">
                <SurfaceColorSelect
                    colorScaleGradientType={surfaceReducer.state.colorScaleGradientType}
                    onColorGradientTypeChange={surfaceReducer.SetColorScaleGradientType}
                />
            </CollapsibleGroup>
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

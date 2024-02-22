import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";

import { isEqual } from "lodash";
import { v4 as uuidv4 } from "uuid";

import { SmdaWellBoreSelect } from "./components/smdaWellBoreSelect";
import { SurfaceAttributeTypeSelect } from "./components/surfaceAttributeTypeSelect";
import { SurfaceSelect } from "./components/surfaceSelect";
import { SyncSettings } from "./components/syncSettings";

import { useEnsembleSetSurfaceMetaQuery } from "../hooks/useEnsembleSetSurfaceMetaQuery";
import { useSurfaceReducer } from "../hooks/useSurfaceReducer";
import { State } from "../state";
import { EnsembleStageType, SurfaceSpecification, SyncedSettings } from "../types";

export function settings({ moduleContext, workbenchSession, workbenchSettings }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const reducer = useSurfaceReducer();

    const ensembleArr = ensembleSet.getEnsembleArr();
    const availableEnsembleIdents = ensembleArr.map((ensemble) => ensemble.getIdent());
    // Check if the ensemble idents in the state are still available
    const ensembleIdents = reducer.state.ensembleIdents.filter((ident) => availableEnsembleIdents.includes(ident));
    if (!isEqual(ensembleIdents, reducer.state.ensembleIdents)) {
        reducer.setEnsembleIdents(ensembleIdents);
    }

    const defaultColorScale = workbenchSettings
        .useContinuousColorScale({
            gradientType: ColorScaleGradientType.Sequential,
        })
        .getColorPalette()
        .getId();

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
            realizationNumsStatistics: [],
            ensembleStage: EnsembleStageType.Realization,
            colorRange: null,
            colorPaletteId: defaultColorScale,
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
        function propagateWellBoreAddressesToView() {
            moduleContext.getStateStore().setValue("smdaWellBoreAddresses", reducer.state.wellAddresses);
        },
        [reducer.state.wellAddresses]
    );
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(reducer.state.ensembleIdents);

    return (
        <>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <Label text="Ensembles">
                    <MultiEnsembleSelect
                        ensembleSet={ensembleSet}
                        value={reducer.state.ensembleIdents}
                        onChange={reducer.setEnsembleIdents}
                        size={4}
                    />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Drilled Wellbores">
                <SmdaWellBoreSelect
                    selectedWellAddresses={reducer.state.wellAddresses || []}
                    onWellBoreChange={reducer.setWellBoreAddresses}
                    ensembleIdent={reducer.state.ensembleIdents ? reducer.state.ensembleIdents[0] : null}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Link settings">
                <SyncSettings syncedSettings={reducer.state.syncedSettings} onChange={handleSyncedSettingsChange} />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Surface selections">
                <>
                    <SurfaceAttributeTypeSelect
                        onAttributeChange={reducer.setAttributeType}
                        onTimeModeChange={reducer.setTimeMode}
                        attributeType={reducer.state.attributeType}
                    />
                    <div className="m-2 flex gap-2 items-center">
                        <Button
                            variant={"contained"}
                            onClick={handleAddSurface}
                            disabled={reducer.state.ensembleIdents.length === 0}
                            startIcon={ensembleSetSurfaceMetas.isFetching ? <CircularProgress /> : null}
                        >
                            Add Surface
                        </Button>
                        {!reducer.state.ensembleIdents.length && "Select ensembles to add surfaces."}
                    </div>
                </>
            </CollapsibleGroup>
            <>
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
        </>
    );
}
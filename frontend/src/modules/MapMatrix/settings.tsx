import React from "react";

import { SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { TimeType } from "@modules/_shared/Surface";

import { v4 as uuidv4 } from "uuid";

import { EnsembleStageType } from "./components/aggregationSelect";
import { SingleSelect } from "./components/singleSelect";
import { SurfaceSelect } from "./components/surfaceSelect";
import { SyncSettings } from "./components/syncSettings";
import { useEnsembleSetSurfaceMetaQuery } from "./hooks/useEnsembleSetSurfaceMetaQuery";
import { State } from "./state";

const TimeTypeEnumToStringMapping = {
    [TimeType.None]: "Static",
    [TimeType.TimePoint]: "Time point",
    [TimeType.Interval]: "Time interval",
};

export type SurfaceSelection = {
    ensembleIdent: EnsembleIdent | null;
    surfaceName: string | null;
    surfaceAttribute: string | null;
    surfaceTimeOrInterval: string | null;
    realizationNum: number | null;
    uuid: string;
    statisticFunction: SurfaceStatisticFunction_api;
    ensembleStage: EnsembleStageType;
    colorMin: number | null;
    colorMax: number | null;
};
export type SyncedSettings = {
    ensemble: boolean;
    name: boolean;
    attribute: boolean;
    timeOrInterval: boolean;
    realizationNum: boolean;
};
type ReducerState = {
    surfaceSelections: SurfaceSelection[];
    syncedSettings: SyncedSettings;
    timeMode: TimeType;
    attributeType: SurfaceAttributeType_api;
};
const initialState: ReducerState = {
    surfaceSelections: [],
    syncedSettings: {
        ensemble: false,
        name: false,
        attribute: false,
        timeOrInterval: false,
        realizationNum: false,
    },
    timeMode: TimeType.None,
    attributeType: SurfaceAttributeType_api.DEPTH,
};
enum ActionType {
    AddSurface,
    RemoveSurface,
    SetSurfaceSelection,
    SetSyncedSettings,
    SetTimeMode,
    SetAttributeType,
}
type Payload = {
    [ActionType.AddSurface]: SurfaceSelection;
    [ActionType.RemoveSurface]: { id: string };
    [ActionType.SetSurfaceSelection]: { uuid: string; surfaceSelection: SurfaceSelection };
    [ActionType.SetSyncedSettings]: { syncedSettings: SyncedSettings };
    [ActionType.SetTimeMode]: { timeMode: TimeType };
    [ActionType.SetAttributeType]: { attributeType: SurfaceAttributeType_api };
};
type Actions = {
    [T in ActionType]: {
        type: T;
        payload: Payload[T];
    };
}[ActionType];
function synchronizeSurfaceSelections(surfaceSelections: SurfaceSelection[], syncedSettings: SyncedSettings) {
    const firstSurfaceSelection = surfaceSelections[0];
    surfaceSelections.forEach((surface, index) => {
        if (index !== 0) {
            if (syncedSettings.ensemble) {
                surface.ensembleIdent = firstSurfaceSelection.ensembleIdent;
            }
            if (syncedSettings.name) {
                surface.surfaceName = firstSurfaceSelection.surfaceName;
            }
            if (syncedSettings.attribute) {
                surface.surfaceAttribute = firstSurfaceSelection.surfaceAttribute;
            }
            if (syncedSettings.timeOrInterval) {
                surface.surfaceTimeOrInterval = firstSurfaceSelection.surfaceTimeOrInterval;
            }
            if (syncedSettings.realizationNum) {
                surface.realizationNum = firstSurfaceSelection.realizationNum;
            }
        }
    });
}
function surfaceDispatcher(state: ReducerState, action: Actions) {
    if (action.type === ActionType.AddSurface) {
        return {
            ...state,
            surfaceSelections: [...state.surfaceSelections, action.payload],
        };
    }
    if (action.type === ActionType.RemoveSurface) {
        return {
            ...state,
            surfaceSelections: state.surfaceSelections.filter((surface) => surface.uuid !== action.payload.id),
        };
    }
    if (action.type === ActionType.SetSurfaceSelection) {
        const updatedSurfaceSelections = state.surfaceSelections.map((surface) =>
            surface.uuid === action.payload.uuid ? action.payload.surfaceSelection : surface
        );
        synchronizeSurfaceSelections(updatedSurfaceSelections, state.syncedSettings);
        return {
            ...state,
            surfaceSelections: updatedSurfaceSelections,
        };
    }
    if (action.type === ActionType.SetSyncedSettings) {
        synchronizeSurfaceSelections(state.surfaceSelections, action.payload.syncedSettings);
        return {
            ...state,
            syncedSettings: action.payload.syncedSettings,
            surfaceSelections: state.surfaceSelections,
        };
    }
    if (action.type === ActionType.SetTimeMode) {
        return {
            ...state,
            timeMode: action.payload.timeMode,
        };
    }
    if (action.type === ActionType.SetAttributeType) {
        return {
            ...state,
            attributeType: action.payload.attributeType,
        };
    }
    return state;
}
export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(
        ensembleSet.getEnsembleArr().map((ens) => ens.getIdent())
    );
    const [state, dispatch] = React.useReducer(surfaceDispatcher, initialState);

    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        dispatch({
            type: ActionType.SetTimeMode,
            payload: {
                timeMode: event.target.value as TimeType,
            },
        });
    }

    function handleSurfaceAttributeTypeChange(val: string) {
        dispatch({
            type: ActionType.SetAttributeType,
            payload: {
                attributeType: val as SurfaceAttributeType_api,
            },
        });
    }
    React.useEffect(
        function propogateSurfaceSelectionsToView() {
            moduleContext.getStateStore().setValue("surfaceSelections", state.surfaceSelections);
        },
        [state.surfaceSelections]
    );
    function handleSyncedSettingsChange(syncedSettings: SyncedSettings) {
        dispatch({
            type: ActionType.SetSyncedSettings,
            payload: {
                syncedSettings: syncedSettings,
            },
        });
    }
    function handleAddSurface() {
        let newSurface: SurfaceSelection = {
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

        if (state.surfaceSelections.length) {
            newSurface = { ...state.surfaceSelections[state.surfaceSelections.length - 1], uuid: uuidv4() };
        }
        dispatch({
            type: ActionType.AddSurface,
            payload: newSurface,
        });
    }
    function handleSurfaceSelectChange(surfaceSelection: SurfaceSelection) {
        dispatch({
            type: ActionType.SetSurfaceSelection,
            payload: {
                uuid: surfaceSelection.uuid,
                surfaceSelection: surfaceSelection,
            },
        });
    }
    function handleRemoveSurface(uuid: string) {
        dispatch({
            type: ActionType.RemoveSurface,
            payload: {
                id: uuid,
            },
        });
    }
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
                    {state.surfaceSelections.map((uniqueSurface, index) => (
                        <SurfaceSelect
                            index={index}
                            key={uniqueSurface.uuid}
                            surfaceMetas={ensembleSetSurfaceMetas}
                            surfaceSelection={uniqueSurface}
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

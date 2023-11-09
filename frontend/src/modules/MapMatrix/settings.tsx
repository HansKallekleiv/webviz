import React, { useState } from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { TimeType } from "@modules/_shared/Surface";
import { Select } from "@mui/base";
import { d } from "@tanstack/react-query-devtools/build/legacy/devtools-c71c5f06";

import { v4 as uuidv4 } from "uuid";

import { LabelledSwitch } from "./components/labelledSwitch";
import { MultiSelect } from "./components/multiSelect";
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
type UniqueSurfaceAddress = {
    id: string;
    data: SurfaceAddress | null;
};
export type SurfaceSelection = {
    ensembleIdent: EnsembleIdent | null;
    surfaceName: string | null;
    surfaceAttribute: string | null;
    surfaceTimeOrInterval: string | null;
    realizationNum: number | null;
    uuid: string;
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
    [ActionType.SetSurfaceSelection]: { surfaceSelections: SurfaceSelection[] };

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
function surfaceReducer(state: ReducerState, action: Actions) {
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
        return {
            ...state,
            surfaceSelections: action.payload.surfaceSelections,
        };
    }
    if (action.type === ActionType.SetSyncedSettings) {
        return {
            ...state,
            syncedSettings: action.payload.syncedSettings,
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
    const [state, dispatch] = React.useReducer(surfaceReducer, initialState);

    // const [surfaceAddresses, setSurfaceAddresses] = useState<Array<UniqueSurfaceAddress>>([]);

    // const [timeType, setTimeType] = React.useState<TimeType>(TimeType.None);
    // const [surfaceAttributeTypes, setSurfaceAttributeTypes] = React.useState<SurfaceAttributeType_api[]>(
    //     Object.values(SurfaceAttributeType_api)
    // );
    // const [isControlledEnsemble, setIsControlledEnsemble] = React.useState<boolean>(false);
    // const [isControlledSurfaceName, setIsControlledSurfaceName] = React.useState<boolean>(false);
    // const [isControlledSurfaceAttribute, setIsControlledSurfaceAttribute] = React.useState<boolean>(false);
    // const [isControlledSurfaceTimeOrInterval, setIsControlledSurfaceTimeOrInterval] = React.useState<boolean>(false);
    // const [isControlledRealizationNum, setIsControlledRealizationNum] = React.useState<boolean>(false);
    // // const [isControlledStage, setIsControlledStage] = React.useState<boolean>(false);

    // const addSurfaceSelect = () => {
    //     const newSurface: UniqueSurfaceAddress = {
    //         id: uuidv4(), // generates a unique ID
    //         data: null,
    //     };

    //     setSurfaceAddresses([...surfaceAddresses, newSurface]);
    // };
    // const removeSurfaceSelect = (uniqueId: string) => {
    //     setSurfaceAddresses(surfaceAddresses.filter((surface) => surface.id !== uniqueId));
    // };
    // const handleSurfaceSelectChange = (uniqueId: string, newData: SurfaceAddress) => {
    //     setSurfaceAddresses((prevAddresses) =>
    //         prevAddresses.map((surface) => (surface.id === uniqueId ? { ...surface, data: newData } : surface))
    //     );
    // };

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
    // React.useEffect(() => {
    //     function propagateSurfaceAddressesToView() {
    //         // Extract SurfaceAddress data from the new structure before setting the value.
    //         const surfaceAddressesData = surfaceAddresses
    //             .map((uniqueSurface) => uniqueSurface.data)
    //             .filter((address): address is SurfaceAddress => address !== null);
    //         console.log("surfaceAddressesData", surfaceAddressesData);
    //         moduleContext.getStateStore().setValue("surfaceAddresses", surfaceAddressesData);
    //     }

    //     propagateSurfaceAddressesToView();
    // }, [surfaceAddresses]);
    function handleSyncedSettingChange(syncedSettingKey: string) {
        // Toggle the synced setting
        const newSyncedSettings = {
            ...state.syncedSettings,
            [syncedSettingKey]: !state.syncedSettings[syncedSettingKey as keyof SyncedSettings],
        };

        // If the setting is now active, propagate the first surface's setting to the others
        let updatedSurfaceSelections = [...state.surfaceSelections];
        if (newSyncedSettings[syncedSettingKey as keyof SyncedSettings]) {
            const firstSurfaceSelection = state.surfaceSelections[0];
            updatedSurfaceSelections = state.surfaceSelections.map((surface, index) => {
                if (index !== 0) {
                    // Skip the first, as it is the source of truth
                    if (newSyncedSettings.ensemble) {
                        surface.ensembleIdent = firstSurfaceSelection.ensembleIdent;
                    }
                    if (newSyncedSettings.name) {
                        surface.surfaceName = firstSurfaceSelection.surfaceName;
                    }
                    if (newSyncedSettings.attribute) {
                        surface.surfaceAttribute = firstSurfaceSelection.surfaceAttribute;
                    }
                    if (newSyncedSettings.timeOrInterval) {
                        surface.surfaceTimeOrInterval = firstSurfaceSelection.surfaceTimeOrInterval;
                    }
                    if (newSyncedSettings.realizationNum) {
                        surface.realizationNum = firstSurfaceSelection.realizationNum;
                    }
                }
                return surface;
            });
        }

        dispatch({
            type: ActionType.SetSyncedSettings,
            payload: {
                syncedSettings: newSyncedSettings,
            },
        });

        dispatch({
            type: ActionType.SetSurfaceSelection,
            payload: {
                surfaceSelections: updatedSurfaceSelections,
            },
        });
    }

    function handleAddSurface() {
        const baseSurfaceSelection = state.surfaceSelections[0] || {
            ensembleIdent: null,
            surfaceName: null,
            surfaceAttribute: null,
            surfaceTimeOrInterval: null,
            realizationNum: null,
        };

        let newSurface = { ...baseSurfaceSelection, uuid: uuidv4() };

        dispatch({
            type: ActionType.AddSurface,
            payload: newSurface,
        });
    }

    function handleSurfaceSelectChange(surfaceSelection: SurfaceSelection) {
        if (state.surfaceSelections.length === 0) {
            return;
        }

        const updatedSurfaceSelections = state.surfaceSelections.map((surface) =>
            surface.uuid === surfaceSelection.uuid ? surfaceSelection : surface
        );

        if (Object.values(state.syncedSettings).some((isActive) => isActive)) {
            const firstSurfaceSelection = updatedSurfaceSelections[0];
            updatedSurfaceSelections.forEach((surface, index) => {
                if (index !== 0) {
                    if (state.syncedSettings.ensemble) {
                        surface.ensembleIdent = firstSurfaceSelection.ensembleIdent;
                    }
                    if (state.syncedSettings.name) {
                        surface.surfaceName = firstSurfaceSelection.surfaceName;
                    }
                    if (state.syncedSettings.attribute) {
                        surface.surfaceAttribute = firstSurfaceSelection.surfaceAttribute;
                    }
                    if (state.syncedSettings.timeOrInterval) {
                        surface.surfaceTimeOrInterval = firstSurfaceSelection.surfaceTimeOrInterval;
                    }
                    if (state.syncedSettings.realizationNum) {
                        surface.realizationNum = firstSurfaceSelection.realizationNum;
                    }
                }
            });
        }

        dispatch({
            type: ActionType.SetSurfaceSelection,
            payload: {
                surfaceSelections: updatedSurfaceSelections,
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
                <SyncSettings syncedSettings={state.syncedSettings} onChange={handleSyncedSettingChange} />
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
                            key={uniqueSurface.uuid}
                            surfaceMetas={ensembleSetSurfaceMetas}
                            surfaceSelection={uniqueSurface}
                            ensembleSet={ensembleSet}
                            timeType={state.timeMode}
                            attributeType={state.attributeType}
                            syncedSettings={state.syncedSettings}
                            onChange={handleSurfaceSelectChange}
                        />
                    ))}
                </tbody>
            </table>
            {JSON.stringify(state)}
        </>
    );
    //         <div className="m-2">
    //             <Button variant={"contained"} onClick={addSurfaceSelect}>
    //                 Add Surface
    //             </Button>
    //         </div>
    //         <table className="table-auto w-full divide-y divide-gray-200">
    //             <tbody>
    //                 {surfaceAddresses.map((uniqueSurface, index) => (
    //                     <SurfaceSelect
    //                         index={index}
    //                         key={"surface-select--" + uniqueSurface.id}
    //                         id={uniqueSurface.id}
    //                         ensembleSetSurfaceMetas={ensembleSetSurfaceMetas}
    //                         surfaceAttributeTypes={surfaceAttributeTypes}
    //                         timeType={timeType}
    //                         workbenchSession={workbenchSession}
    //                         onRemove={removeSurfaceSelect}
    //                         controlledEnsembleIdent={
    //                             index > 0 && isControlledEnsemble
    //                                 ? {
    //                                       caseUuid: surfaceAddresses[0]?.data?.caseUuid || "",
    //                                       ensembleName: surfaceAddresses[0]?.data?.ensemble || "",
    //                                   }
    //                                 : undefined
    //                         }
    //                         controlledSurfaceName={
    //                             index > 0 && isControlledSurfaceName ? surfaceAddresses[0]?.data?.name : undefined
    //                         }
    //                         controlledSurfaceAttribute={
    //                             index > 0 && isControlledSurfaceAttribute
    //                                 ? surfaceAddresses[0]?.data?.attribute
    //                                 : undefined
    //                         }
    //                         controlledSurfaceTimeOrInterval={
    //                             index > 0 && isControlledSurfaceTimeOrInterval
    //                                 ? surfaceAddresses[0]?.data?.isoDateOrInterval
    //                                 : undefined
    //                         }
    //                         controlledRealizationNum={
    //                             index > 0 && isControlledRealizationNum
    //                                 ? surfaceAddresses[0]?.data?.addressType === "realization"
    //                                     ? surfaceAddresses[0]?.data?.realizationNum
    //                                     : undefined
    //                                 : undefined
    //                         }
    //                         onAddressChange={(data: SurfaceAddress) =>
    //                             handleSurfaceSelectChange(uniqueSurface.id, data)
    //                         }
    //                     />
    //                 ))}
    //             </tbody>
    //         </table>
    //     </div>
    // );
}

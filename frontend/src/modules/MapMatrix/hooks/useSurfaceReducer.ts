import { useReducer } from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SurfaceTimeType } from "@modules/_shared/Surface";
import { WellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

import { SurfaceReducerActionType, surfaceDispatcher } from "../reducers/surfaceReducer";
import { MapMatrixDefaultState } from "../state";
import {
    FaultPolygonsSpecification,
    SurfaceAttributeType,
    SurfaceReducerState,
    SurfaceSpecification,
    SyncedSettings,
} from "../types";

export const initialSurfaceReducerState: SurfaceReducerState = {
    ensembleIdents: [],
    surfaceSpecifications: [],
    faultPolygonsSpecification: {
        useFaultPolygons: true,
        useSurfaceName: true,
        useDefaultPolygonsName: true,
        polygonsAttribute: null,
        defaultPolygonsName: null,
    },
    syncedSettings: {
        ensemble: false,
        name: false,
        attribute: false,
        timeOrInterval: false,
        realizationNum: false,
        colorRange: false,
        colorPaletteId: false,
    },
    timeMode: SurfaceTimeType.None,
    attributeType: SurfaceAttributeType.STATIC_ATTRIBUTE,
    wellAddresses: MapMatrixDefaultState.smdaWellBoreAddresses,
};

export const useSurfaceReducer = () => {
    const [state, dispatch] = useReducer(surfaceDispatcher, initialSurfaceReducerState);

    const setEnsembleIdents = (ensembleIdents: EnsembleIdent[]) => {
        dispatch({
            type: SurfaceReducerActionType.SetEnsembleIdents,
            payload: { ensembleIdents },
        });
    };
    const addSurface = (surfaceSpecification: SurfaceSpecification) => {
        dispatch({
            type: SurfaceReducerActionType.AddSurface,
            payload: surfaceSpecification,
        });
    };

    const removeSurface = (id: string) => {
        dispatch({
            type: SurfaceReducerActionType.RemoveSurface,
            payload: { id },
        });
    };

    const setSurface = (surfaceSpecification: SurfaceSpecification) => {
        dispatch({
            type: SurfaceReducerActionType.SetSurface,
            payload: { surfaceSpecification },
        });
    };

    const setSyncedSettings = (syncedSettings: SyncedSettings) => {
        dispatch({
            type: SurfaceReducerActionType.SetSyncedSettings,
            payload: { syncedSettings },
        });
    };

    const setTimeMode = (timeMode: SurfaceTimeType) => {
        dispatch({
            type: SurfaceReducerActionType.SetTimeMode,
            payload: { timeMode },
        });
    };

    const setAttributeType = (attributeType: SurfaceAttributeType) => {
        dispatch({
            type: SurfaceReducerActionType.SetAttributeType,
            payload: { attributeType },
        });
    };
    const setWellBoreAddresses = (wellAddresses: WellBoreAddress[]) => {
        dispatch({
            type: SurfaceReducerActionType.SetWellBoreAddresses,
            payload: { wellAddresses },
        });
    };
    const setFaultPolygonsSpecification = (faultPolygonsSpecification: FaultPolygonsSpecification) => {
        dispatch({
            type: SurfaceReducerActionType.SetFaultPolygonsSpecification,
            payload: { faultPolygonsSpecification },
        });
    };

    return {
        state,
        setEnsembleIdents,
        addSurface,
        removeSurface,
        setSurface,
        setSyncedSettings,
        setTimeMode,
        setAttributeType,
        setWellBoreAddresses,
        setFaultPolygonsSpecification,
    };
};

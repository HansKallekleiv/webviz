import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { SurfaceTimeType } from "@modules/_shared/Surface";
import { WellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

import {
    FaultPolygonsSpecification,
    SurfaceAttributeType,
    SurfaceReducerState,
    SurfaceSpecification,
    SyncedSettings,
} from "../types";

export enum SurfaceReducerActionType {
    SetEnsembleIdents,
    AddSurface,
    RemoveSurface,
    SetSurface,
    SetSyncedSettings,
    SetTimeMode,
    SetAttributeType,
    SetWellBoreAddresses,
    SetFaultPolygonsSpecification,
}
type SurfaceReducerPayload = {
    [SurfaceReducerActionType.SetEnsembleIdents]: { ensembleIdents: EnsembleIdent[] };
    [SurfaceReducerActionType.AddSurface]: SurfaceSpecification;
    [SurfaceReducerActionType.RemoveSurface]: { id: string };
    [SurfaceReducerActionType.SetSurface]: { surfaceSpecification: SurfaceSpecification };
    [SurfaceReducerActionType.SetSyncedSettings]: { syncedSettings: SyncedSettings };
    [SurfaceReducerActionType.SetTimeMode]: { timeMode: SurfaceTimeType };
    [SurfaceReducerActionType.SetAttributeType]: { attributeType: SurfaceAttributeType };
    [SurfaceReducerActionType.SetWellBoreAddresses]: { wellAddresses: WellBoreAddress[] };
    [SurfaceReducerActionType.SetFaultPolygonsSpecification]: {
        faultPolygonsSpecification: FaultPolygonsSpecification;
    };
};
type SurfaceReducerActions = {
    [T in SurfaceReducerActionType]: {
        type: T;
        payload: SurfaceReducerPayload[T];
    };
}[SurfaceReducerActionType];

export function surfaceDispatcher(state: SurfaceReducerState, action: SurfaceReducerActions) {
    if (action.type === SurfaceReducerActionType.SetEnsembleIdents) {
        return {
            ...state,
            ensembleIdents: action.payload.ensembleIdents,
        };
    }
    if (action.type === SurfaceReducerActionType.AddSurface) {
        return {
            ...state,
            surfaceSpecifications: [...state.surfaceSpecifications, action.payload],
        };
    }
    if (action.type === SurfaceReducerActionType.RemoveSurface) {
        return {
            ...state,
            surfaceSpecifications: state.surfaceSpecifications.filter((surface) => surface.uuid !== action.payload.id),
        };
    }
    if (action.type === SurfaceReducerActionType.SetSurface) {
        const updatedSurfaceSpecifications = state.surfaceSpecifications.map((surface) =>
            surface.uuid === action.payload.surfaceSpecification.uuid ? action.payload.surfaceSpecification : surface
        );

        return {
            ...state,
            surfaceSpecifications: synchronizeSurfaceSpecifications(updatedSurfaceSpecifications, state.syncedSettings),
        };
    }
    if (action.type === SurfaceReducerActionType.SetSyncedSettings) {
        return {
            ...state,
            syncedSettings: action.payload.syncedSettings,
            surfaceSpecifications: synchronizeSurfaceSpecifications(
                state.surfaceSpecifications,
                action.payload.syncedSettings
            ),
        };
    }
    if (action.type === SurfaceReducerActionType.SetTimeMode) {
        return {
            ...state,
            timeMode: action.payload.timeMode,
        };
    }
    if (action.type === SurfaceReducerActionType.SetAttributeType) {
        return {
            ...state,
            attributeType: action.payload.attributeType,
        };
    }
    if (action.type === SurfaceReducerActionType.SetWellBoreAddresses) {
        return {
            ...state,
            wellAddresses: action.payload.wellAddresses,
        };
    }
    if (action.type === SurfaceReducerActionType.SetFaultPolygonsSpecification) {
        return {
            ...state,
            faultPolygonsSpecification: action.payload.faultPolygonsSpecification,
        };
    }

    return state;
}

function synchronizeSurfaceSpecifications(
    surfaceSpecifications: SurfaceSpecification[],
    syncedSettings: SyncedSettings
) {
    if (surfaceSpecifications.length === 0) {
        return surfaceSpecifications;
    }
    const firstSurfaceSpecification = surfaceSpecifications[0];

    // Create a new array with updated objects to ensure changes are detected
    const updatedSurfaceSpecifications = surfaceSpecifications.map((surface, index) => {
        if (index !== 0) {
            const updatedSurface = { ...surface }; // Create a shallow copy
            if (syncedSettings.ensemble) {
                updatedSurface.ensembleIdent = firstSurfaceSpecification.ensembleIdent;
            }
            if (syncedSettings.name) {
                updatedSurface.surfaceName = firstSurfaceSpecification.surfaceName;
            }
            if (syncedSettings.attribute) {
                updatedSurface.surfaceAttribute = firstSurfaceSpecification.surfaceAttribute;
            }
            if (syncedSettings.timeOrInterval) {
                updatedSurface.surfaceTimeOrInterval = firstSurfaceSpecification.surfaceTimeOrInterval;
            }
            if (syncedSettings.realizationNum) {
                updatedSurface.realizationNum = firstSurfaceSpecification.realizationNum;
            }
            if (syncedSettings.colorRange) {
                updatedSurface.colorRange = firstSurfaceSpecification.colorRange;
            }
            if (syncedSettings.colorPaletteId) {
                updatedSurface.colorPaletteId = firstSurfaceSpecification.colorPaletteId;
            }
            return updatedSurface;
        }
        return surface;
    });

    return updatedSurfaceSpecifications; // Return the new array for state update
}

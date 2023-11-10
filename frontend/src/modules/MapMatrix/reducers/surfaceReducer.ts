import {
    SurfaceReducerActionType,
    SurfaceReducerActions,
    SurfaceReducerState,
    SurfaceSpecification,
    SyncedSettings,
} from "../types";

export function surfaceDispatcher(state: SurfaceReducerState, action: SurfaceReducerActions) {
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
        synchronizeSurfaceSpecifications(updatedSurfaceSpecifications, state.syncedSettings);
        return {
            ...state,
            surfaceSpecifications: updatedSurfaceSpecifications,
        };
    }
    if (action.type === SurfaceReducerActionType.SetSyncedSettings) {
        synchronizeSurfaceSpecifications(state.surfaceSpecifications, action.payload.syncedSettings);
        return {
            ...state,
            syncedSettings: action.payload.syncedSettings,
            surfaceSpecifications: state.surfaceSpecifications,
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
    return state;
}

function synchronizeSurfaceSpecifications(
    surfaceSpecifications: SurfaceSpecification[],
    syncedSettings: SyncedSettings
) {
    const firstSurfaceSpecification = surfaceSpecifications[0];
    surfaceSpecifications.forEach((surface, index) => {
        if (index !== 0) {
            if (syncedSettings.ensemble) {
                surface.ensembleIdent = firstSurfaceSpecification.ensembleIdent;
            }
            if (syncedSettings.name) {
                surface.surfaceName = firstSurfaceSpecification.surfaceName;
            }
            if (syncedSettings.attribute) {
                surface.surfaceAttribute = firstSurfaceSpecification.surfaceAttribute;
            }
            if (syncedSettings.timeOrInterval) {
                surface.surfaceTimeOrInterval = firstSurfaceSpecification.surfaceTimeOrInterval;
            }
            if (syncedSettings.realizationNum) {
                surface.realizationNum = firstSurfaceSpecification.realizationNum;
            }
        }
    });
}

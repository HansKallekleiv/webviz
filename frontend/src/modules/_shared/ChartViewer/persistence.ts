import type { ModuleComponentSerializationFunctions, ModuleStateSchema } from "@framework/Module";

import {
    deserializeSettings,
    SERIALIZED_SETTINGS_SCHEMA,
    serializeSettings,
    type SerializedSettings,
} from "./settings/settingsSerialization";

export type SerializedState = {
    settings: SerializedSettings;
};

export const SERIALIZED_STATE_SCHEMA: ModuleStateSchema<SerializedState> = {
    settings: SERIALIZED_SETTINGS_SCHEMA,
};

export const serializeStateFunctions: ModuleComponentSerializationFunctions<SerializedState> = {
    serializeStateFunctions: { settings: serializeSettings },
    deserializeStateFunctions: { settings: deserializeSettings },
};
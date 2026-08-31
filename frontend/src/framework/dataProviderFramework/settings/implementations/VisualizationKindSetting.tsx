import type React from "react";

import { Combobox } from "@lib/components/Combobox";

import type { VisualizationKind } from "../../dataProviders/visualizationKinds";
import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertStringOrNull } from "../utils/structureValidation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arraySingleSelect";

type Value = VisualizationKind | null;

export class VisualizationKindSetting implements CustomSettingImplementation<Value, Value, VisualizationKind[]> {
    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<VisualizationKind[]>();

    mapInternalToExternalValue(value: Value): Value {
        return value;
    }

    serializeValue(value: Value): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): Value {
        const value = JSON.parse(serializedValue);
        assertStringOrNull(value);
        return value as Value;
    }

    isValueValid(value: Value, constraints: VisualizationKind[]): boolean {
        return isValueValid(value, constraints, (item) => item);
    }

    fixupValue(value: Value, constraints: VisualizationKind[]): Value {
        return fixupValue(value, constraints, (item) => item);
    }

    makeComponent(): (props: SettingComponentProps<Value, VisualizationKind[]>) => React.ReactNode {
        return function VisualizationKindComponent(props) {
            return (
                <Combobox
                    items={(props.valueConstraints ?? []).map((value) => ({ value, label: value }))}
                    value={props.value}
                    onValueChange={props.onValueChange}
                    disabled={props.disabled}
                />
            );
        };
    }
}
import type React from "react";

import { upperFirst } from "lodash-es";

import { Combobox } from "@lib/components/Combobox";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { PlotDimension } from "../../visualization/plotTypes";
import { assertStringOrNull } from "../utils/structureValidation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arraySingleSelect";

type Value = PlotDimension | null;

export class PlotDimensionSetting implements CustomSettingImplementation<Value, Value, PlotDimension[]> {
    valueConstraintsIntersectionReducerDefinition = makeValueConstraintsIntersectionReducerDefinition<PlotDimension[]>();

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

    isValueValid(value: Value, constraints: PlotDimension[]): boolean {
        return isValueValid(value, constraints, (item) => item);
    }

    fixupValue(value: Value, constraints: PlotDimension[]): Value {
        return fixupValue(value, constraints, (item) => item);
    }

    makeComponent(): (props: SettingComponentProps<Value, PlotDimension[]>) => React.ReactNode {
        return function PlotDimensionComponent(props) {
            return (
                <Combobox
                    items={(props.valueConstraints ?? []).map((value) => ({
                        value,
                        label: value === PlotDimension.NONE ? "None" : upperFirst(value.replaceAll("_", " ").toLowerCase()),
                    }))}
                    value={props.value}
                    onValueChange={props.onValueChange}
                    disabled={props.disabled}
                />
            );
        };
    }
}
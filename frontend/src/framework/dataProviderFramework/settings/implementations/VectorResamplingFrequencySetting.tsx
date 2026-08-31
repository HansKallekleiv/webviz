import type React from "react";

import { upperFirst } from "lodash-es";

import { Frequency_api } from "@api";
import { Combobox } from "@lib/components/Combobox";

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

type ValueType = Frequency_api | null;
type ValueConstraintsType = ValueType[];

export class VectorResamplingFrequencySetting
    implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType>
{
    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid(value, valueConstraints, (item) => item);
    }

    fixupValue(value: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue(value, valueConstraints, (item) => item);
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const value = JSON.parse(serializedValue);
        assertStringOrNull(value);
        if (value !== null && !Object.values(Frequency_api).includes(value as Frequency_api)) {
            throw new Error(`Invalid vector resampling frequency: ${value}`);
        }
        return value as ValueType;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function VectorResamplingFrequencySetting(props) {
            return (
                <Combobox
                    items={(props.valueConstraints ?? []).map((value) => ({
                        value,
                        label: value === null ? "Raw" : upperFirst(value.toLowerCase()),
                    }))}
                    value={props.value}
                    onValueChange={props.onValueChange}
                    disabled={props.disabled}
                />
            );
        };
    }
}
import type React from "react";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { Slider } from "@lib/components/Slider";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = [number, number] | null;

export enum Direction {
    I,
    J,
    K,
}

export class DateRangeSetting implements CustomSettingImplementation<ValueType, SettingCategory.RANGE> {
    defaultValue: ValueType = null;

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.RANGE>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<ValueType, SettingCategory.RANGE>) {
            function handleChange(_: any, value: number | number[]) {
                if (!Array.isArray(value)) {
                    return;
                }

                props.onValueChange([value[0], value[1]]);
            }
            function formatValue(value: number) {
                return timestampUtcMsToCompactIsoString(value);
            }
            return (
                <Slider
                    min={props.availableValues?.[0] ?? 0}
                    max={props.availableValues?.[1] ?? 1}
                    onChange={handleChange}
                    value={props.value ?? [props.availableValues?.[0] ?? 0, props.availableValues?.[1] ?? 1]}
                    debounceTimeMs={500}
                    valueLabelDisplay="auto"
                    valueLabelFormat={formatValue}
                    step={86400000}
                />
            );
        };
    }
}

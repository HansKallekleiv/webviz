import type React from "react";

import type { TagOption } from "@lib/components/TagPicker";
import { TagPicker } from "@lib/components/TagPicker";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = string[];

export class TagPickerSetting implements CustomSettingImplementation<ValueType, SettingCategory.MULTI_SELECT> {
    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) => React.ReactNode {
        return function TagPickerSetting(props: SettingComponentProps<ValueType, SettingCategory.MULTI_SELECT>) {
            const availableValues = props.availableValues ?? [];

            const options: TagOption<string>[] = availableValues.map((value) => {
                return {
                    value: value,
                    label: value === null ? "None" : value,
                };
            });

            return (
                <TagPicker
                    tags={options}
                    value={props.value || availableValues}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                />
            );
        };
    }
}

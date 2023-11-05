import React, { useEffect } from "react";

import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";

export type MultiSelectProps = {
    name: string;
    options: string[];
    initialSelection?: string[];
    size: number;
    labelFunction?: (value: string) => string;
    onChange?: (values: string[]) => void;
};
export const MultiSelect: React.FC<MultiSelectProps> = (props) => {
    const [values, setValues] = React.useState<string[]>(props.initialSelection ?? props.options);

    const selectOptions = props.options.map((option) => ({ value: option, label: option }));

    useEffect(
        function validateValuesOnOptionsChange() {
            const validValues = values.filter((value) => props.options.includes(value));
            if (validValues.length !== values.length) {
                setValues(validValues);
                props.onChange?.(validValues);
            }
        },
        [props.options]
    );

    function handleSelectionChange(values: string[]) {
        setValues(values);
        props.onChange?.(values);
    }
    return (
        <Label text={props.name}>
            <Select
                options={selectOptions}
                size={props.size}
                multiple={true}
                value={values} // Map values to option objects
                onChange={handleSelectionChange}
            />
        </Label>
    );
};

import React from "react";

import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";

export type SingleSelectProps = {
    name: string;
    options: string[];
    initialSelection?: string[];
    size: number;
    onChange?: (values: string[]) => void;
};
export const SingleSelect: React.FC<SingleSelectProps> = (props) => {
    const [value, setValue] = useValidState<string>(
        props.initialSelection && props.initialSelection.length ? props.initialSelection[0] : "",
        props.options
    );

    const selectOptions = props.options.map((option) => ({ value: `${option}`, label: `${option}` }));

    function handleSelectionChange(values: string[]) {
        setValue(values[0]);
        if (props.onChange) {
            props.onChange([values[0]]);
        }
    }

    return (
        <Label text={props.name}>
            <Select options={selectOptions} size={props.size} value={[value]} onChange={handleSelectionChange} />
        </Label>
    );
};

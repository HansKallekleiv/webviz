import React from "react";

import { MultiSelect } from "./multiSelect";
import { SingleSelect } from "./singleSelect";

export type SingleOrMultiSelectProps = {
    multiple: boolean;
    name: string;
    options: string[];
    initialSelection?: string[];
    size: number;
    labelFunction?: (value: string) => string;
    onChange?: (values: string[]) => void;
};
export const SingleOrMultiSelect: React.FC<SingleOrMultiSelectProps> = (props) => {
    return props.multiple ? (
        <MultiSelect {...props} />
    ) : (
        <SingleSelect {...props} initialSelection={props.initialSelection?.slice(0, 1)} />
    );
};

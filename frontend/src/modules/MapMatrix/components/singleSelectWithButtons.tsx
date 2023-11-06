import React from "react";

import { Button } from "@lib/components/Button";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { useValidState } from "@lib/hooks/useValidState";
import ArrowCircleLeftIcon from "@mui/icons-material/ArrowCircleLeft";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";

export type SingleSelectWithButtonsProps = {
    name: string;
    options: string[];
    controlledValue?: string;

    labelFunction?: (value: string) => string;
    onChange?: (values: string) => void;
};
export const SingleSelectWithButtons: React.FC<SingleSelectWithButtonsProps> = (props) => {
    const [localValue, setLocalValue] = useValidState(props.options[0], props.options);

    const displayValue = props.controlledValue ? props.controlledValue : localValue;

    const selectOptions = props.options.map((option) => ({
        value: option,
        label: props.labelFunction?.(option) ?? option,
    }));

    const handleSelectionChange = (selectedValue: string) => {
        if (!props.controlledValue) {
            setLocalValue(selectedValue);
        }
        props.onChange?.(selectedValue);
    };

    const changeSelection = (direction: "prev" | "next") => {
        const currentIndex = props.options.indexOf(displayValue);
        let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex >= props.options.length) {
            nextIndex = 0;
        } else if (nextIndex < 0) {
            nextIndex = props.options.length - 1;
        }

        const nextValue = props.options[nextIndex];
        handleSelectionChange(nextValue);
    };

    return (
        <div>
            <Label text={props.name}>
                <div className="flex items-center space-x-2">
                    <div className={"w-full"}>
                        <Dropdown options={selectOptions} value={displayValue} onChange={handleSelectionChange} />
                    </div>

                    <IconButton onClick={() => changeSelection("prev")}>
                        <ArrowCircleLeftIcon />
                    </IconButton>
                    <IconButton onClick={() => changeSelection("next")}>
                        <ArrowCircleRightIcon />
                    </IconButton>
                </div>
            </Label>
        </div>
    );
};

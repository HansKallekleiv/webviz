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
    value: string;
    labelFunction?: (value: string) => string;
    onChange?: (values: string) => void;
};
export const SingleSelectWithButtons: React.FC<SingleSelectWithButtonsProps> = (props) => {
    const selectOptions = props.options.map((option) => ({
        value: option,
        label: props.labelFunction?.(option) ?? option,
    }));

    const handleSelectionChange = (selectedValue: string) => {
        props.onChange?.(selectedValue);
    };

    const changeSelection = (direction: "prev" | "next") => {
        const currentIndex = props.options.indexOf(props.value);
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
        <tr>
            <td className="px-6 py-0 whitespace-nowrap">{props.name}</td>
            <td className="px-6 py-0 w-full whitespace-nowrap">
                {/* Dropdown */}
                <Dropdown options={selectOptions} value={props.value} onChange={handleSelectionChange} />
            </td>
            <td className="px-0 py-0 whitespace-nowrap text-right">
                {/* Action Buttons */}
                <div className="flex justify-end">
                    <IconButton onClick={() => changeSelection("prev")}>
                        {/* Replace with actual icon */}
                        <ArrowCircleLeftIcon />
                    </IconButton>
                    <IconButton onClick={() => changeSelection("next")}>
                        {/* Replace with actual icon */}
                        <ArrowCircleRightIcon />
                    </IconButton>
                </div>
            </td>
        </tr>
    );
};

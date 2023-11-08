import React from "react";

import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";
import { useValidState } from "@lib/hooks/useValidState";

export type LabelledSwitchProps = {
    label: string;
    checked: boolean;

    onToggle: (checked: boolean) => void;
};
export const LabelledSwitch: React.FC<LabelledSwitchProps> = (props) => {
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (props.onToggle) {
            props.onToggle(e.target.checked);
        }
    };
    return (
        <div className="flex items-center ">
            <Label text={props.label} position="right">
                <Switch checked={props.checked} onChange={onChange} />
            </Label>
        </div>
    );
};

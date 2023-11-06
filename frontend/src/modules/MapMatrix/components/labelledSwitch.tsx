import React from "react";

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
        <div className="flex items-center space-x-2">
            <Switch checked={props.checked} onChange={onChange} />
            {props.label}
        </div>
    );
};

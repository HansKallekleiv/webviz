import React from "react";

import { Ensemble } from "@framework/Ensemble";

import { SingleSelectWithButtons } from "./singleSelectWithButtons";

export type SingleRealizationSelectWithButtonsProps = {
    ensemble: Ensemble | null;
    onChange?: (realizationNum: number) => void;
    controlledValue?: number;
};

export const SingleRealizationSelectWithButtons: React.FC<SingleRealizationSelectWithButtonsProps> = (props) => {
    const realizations: number[] = props.ensemble ? props.ensemble.getRealizations().map((real: number) => real) : [];

    function handleRealizationsChange(val: string) {
        if (props.onChange) {
            props.onChange(parseInt(val));
        }
    }
    return (
        <SingleSelectWithButtons
            name="Realization"
            options={realizations.map((real: number) => real.toString())}
            onChange={handleRealizationsChange}
            controlledValue={props.controlledValue?.toString()}
        />
    );
};

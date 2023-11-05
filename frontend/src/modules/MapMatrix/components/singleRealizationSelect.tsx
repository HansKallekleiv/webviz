import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { SingleSelect } from "./singleSelect";

export type SingleRealizationSelectProps = {
    ensemble: Ensemble | null;
    onChange?: (realizationNum: number) => void;
    size: number;
};

export const SingleRealizationSelect: React.FC<SingleRealizationSelectProps> = (props) => {
    const realizations: number[] = props.ensemble ? props.ensemble.getRealizations().map((real: number) => real) : [];

    function handleRealizationsChange(val: string) {
        if (props.onChange) {
            props.onChange(parseInt(val));
        }
    }
    return (
        <SingleSelect
            name="Realization"
            options={realizations.map((real: number) => real.toString())}
            size={props.size}
            onChange={handleRealizationsChange}
        />
    );
};

import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { Button } from "@lib/components/Button";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { useValidState } from "@lib/hooks/useValidState";
import ArrowCircleLeftIcon from "@mui/icons-material/ArrowCircleLeft";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";

export type EnsembleSelectWithButtonsProps = {
    name: string;
    ensembleSet: EnsembleSet;
    controlledValue: EnsembleIdent | null;

    onChange?: (values: EnsembleIdent | null) => void;
};
export const EnsembleSelectWithButtons: React.FC<EnsembleSelectWithButtonsProps> = (props) => {
    console.log("I am in ensemble");
    const availableEnsembles = props.ensembleSet.getEnsembleArr();
    const availableEnsembleOptions = availableEnsembles.map((ensemble) => ({
        value: ensemble.getIdent().toString(),
        label: ensemble.getDisplayName(),
    }));
    const availableEnsembleIdentStrings = availableEnsembles.map((ensemble) => ensemble.getIdent().toString());

    const [localValue, setLocalValue] = useValidState(availableEnsembleIdentStrings[0], availableEnsembleIdentStrings);

    const displayValue = props.controlledValue ? props.controlledValue.toString() : localValue;

    const handleSelectionChange = (selectedValue: string) => {
        console.log("Ensemble changed");
        const foundEnsemble = props.ensembleSet.findEnsembleByIdentString(selectedValue);
        if (!props.controlledValue) {
            setLocalValue(selectedValue);
        }
        props.onChange?.(foundEnsemble ? foundEnsemble.getIdent() : null);
    };

    const changeSelection = (direction: "prev" | "next") => {
        const currentIndex = availableEnsembleIdentStrings.indexOf(displayValue);
        let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex >= availableEnsembleIdentStrings.length) {
            nextIndex = 0;
        } else if (nextIndex < 0) {
            nextIndex = availableEnsembleIdentStrings.length - 1;
        }

        const nextValue = availableEnsembleIdentStrings[nextIndex];
        handleSelectionChange(nextValue);
    };

    return (
        <tr>
            <td className="px-6 py-0 whitespace-nowrap">{props.name}</td>
            <td className="px-6 py-0 w-full whitespace-nowrap">
                {/* Dropdown */}
                <Dropdown options={availableEnsembleOptions} value={displayValue} onChange={handleSelectionChange} />
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

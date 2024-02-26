import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { ColorGradient } from "@lib/components/ColorGradient/colorGradient";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { useBlockedWellNames } from "./queryHooks";
import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = props.moduleContext.useStoreState("ensembleIdent");

    const computedEnsembleIdent = fixupEnsembleIdent(selectedEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
    }
    const blockedWellLogNamesQuery = useBlockedWellNames(
        computedEnsembleIdent?.getCaseUuid() || null,
        computedEnsembleIdent?.getEnsembleName() || null
    );
    const blockedWellLogNames = blockedWellLogNamesQuery.data || [];
    const blockedWellLogNamesOptions = blockedWellLogNames.map((name) => ({ label: name, value: name }));
    const [selectedWellName, setSelectedWellName] = useValidState<string | null>({
        initialState: null,
        validStates: blockedWellLogNames,
    });
    React.useEffect(() => {
        props.moduleContext.getStateStore().setValue("wellName", selectedWellName);
    }, [selectedWellName]);

    function handleWellNameChange(wellNames: string[]) {
        setSelectedWellName(wellNames[0]);
    }
    return (
        <div className="flex flex-col gap-4">
            <Label text="Ensemble:">
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <Label text="Blocked Well Log Names">
                <Select
                    options={blockedWellLogNamesOptions}
                    onChange={handleWellNameChange}
                    value={[selectedWellName || ""]}
                    size={10}
                />
            </Label>
        </div>
    );
};

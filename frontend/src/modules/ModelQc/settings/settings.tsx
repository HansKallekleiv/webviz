import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox";
import { NumberInput } from "@lib/newComponents/NumberInput";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../interfaces";

import { gridCheckThresholdAtom } from "./atoms/baseAtoms";
import { availableGridNamesAtom } from "./atoms/derivedAtoms";
import { selectedEnsembleIdentAtom, selectedGridNameAtom } from "./atoms/persistableFixableAtoms";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const ensembleRealizationFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [selectedGridName, setSelectedGridName] = useAtom(selectedGridNameAtom);
    const [gridCheckThreshold, setGridCheckThreshold] = useAtom(gridCheckThresholdAtom);

    const availableGridNames = useAtomValue(availableGridNamesAtom);

    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);
    const selectedGridNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedGridNameAtom);

    function handleEnsembleSelectionChange(newEnsembleIdent: RegularEnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
    }

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Data source" defaultOpen>
                    <SettingWrapper label="Ensemble" annotations={selectedEnsembleIdentAnnotations}>
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={selectedEnsembleIdent.value}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunc}
                            onChange={handleEnsembleSelectionChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Grid model"
                        annotations={selectedGridNameAnnotations}
                        help={{
                            title: "Grid model",
                            content:
                                "The 3D grid model whose dynamic properties are checked, and whose first two " +
                                "time steps define t0 and t1 for the equilibrium check.",
                        }}
                    >
                        <Combobox
                            items={availableGridNames.map((gridName) => ({ label: gridName, value: gridName }))}
                            value={selectedGridName.value ?? undefined}
                            onValueChange={(value) => value !== null && setSelectedGridName(value)}
                            placeholder="Select grid model..."
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Grid property check" defaultOpen>
                    <SettingWrapper
                        label="Relative change threshold"
                        help={{
                            title: "Relative change threshold",
                            content:
                                "Max allowed relative change of a dynamic grid property between t0 and t1 for a " +
                                "realization to pass the grid property check.",
                        }}
                    >
                        <NumberInput
                            value={gridCheckThreshold}
                            min={0.00000}
                            onValueChange={(value) => value !== null && setGridCheckThreshold(value)}
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}

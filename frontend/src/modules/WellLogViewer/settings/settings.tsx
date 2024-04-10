import { WellBoreHeader_api, WellboreLogCurveInfo_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtomValue, useSetAtom } from "jotai";

import {
    userSelectedDrilledWellboreUuidAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedLogCurveNamesAtom,
    userSelectedLogRunNameAtom,
} from "./atoms/baseAtoms";
import {
    selectedDrilledWellboreAtom,
    selectedEnsembleIdentAtom,
    selectedLogCurveNamesAtom,
    selectedLogRunNameAtom,
} from "./atoms/derivedAtoms";
import {
    drilledWellboreHeadersQueryAtom,
    wellboreLogCurveHeadersQueryAtom,
    wellboreLogCurvesDataQueryAtom,
} from "./atoms/queryAtoms";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function Settings(props: ModuleSettingsProps<State, SettingsToViewInterface>) {
    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const setSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);

    const drilledWellHeaders = useAtomValue(drilledWellboreHeadersQueryAtom);

    const selectedDrilledWellbore = useAtomValue(selectedDrilledWellboreAtom);
    const setSelectedDrilledWellbore = useSetAtom(userSelectedDrilledWellboreUuidAtom);

    let drilledWellHeadersErrorMessage = "";

    if (drilledWellHeaders.isError) {
        statusWriter.addError("Failed to load wellbore headers");
        drilledWellHeadersErrorMessage = drilledWellHeaders.error.message;
    }

    const wellboreLogCurveHeaders = useAtomValue(wellboreLogCurveHeadersQueryAtom);
    const selectedLogRunName = useAtomValue(selectedLogRunNameAtom);
    const setSelectedLogRunName = useSetAtom(userSelectedLogRunNameAtom);
    const selectedLogCurveNames = useAtomValue(selectedLogCurveNamesAtom);
    const setSelectedLogCurveNames = useSetAtom(userSelectedLogCurveNamesAtom);
    let logCurveHeadersErrorMessage = "";

    if (wellboreLogCurveHeaders.isError) {
        statusWriter.addError("Failed to load wellbore log curve headers");
        logCurveHeadersErrorMessage = wellboreLogCurveHeaders.error.message;
    }

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }

    function handleDrilledWellboreSelectionChange(wellboreUuid: string[] | null) {
        setSelectedDrilledWellbore(wellboreUuid?.at(0) ?? null);
    }

    function handleLogRunSelectionChange(logRunName: string[] | null) {
        setSelectedLogRunName(logRunName?.at(0) ?? null);
    }
    function handleLogCurvesSelectionChange(logCurveNames: string[] | null) {
        setSelectedLogCurveNames(logCurveNames ?? []);
    }
    return (
        <>
            <CollapsibleGroup title="Ensemble Selection" expanded>
                <Label text="Ensemble">
                    <EnsembleDropdown
                        ensembleSet={ensembleSet}
                        value={selectedEnsembleIdent}
                        onChange={handleEnsembleSelectionChange}
                    />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup title="Drilled wellbore" expanded>
                <PendingWrapper isPending={drilledWellHeaders.isFetching} errorMessage={drilledWellHeadersErrorMessage}>
                    <Select
                        options={makeDrilledWellHeaderOptions(drilledWellHeaders.data ?? [])}
                        value={selectedDrilledWellbore ? [selectedDrilledWellbore] : []}
                        onChange={handleDrilledWellboreSelectionChange}
                        size={5}
                        filter
                    />
                </PendingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Log Run" expanded>
                <PendingWrapper
                    isPending={wellboreLogCurveHeaders.isFetching}
                    errorMessage={logCurveHeadersErrorMessage}
                >
                    <Select
                        options={makeLogRunOptions(wellboreLogCurveHeaders.data ?? [])}
                        value={selectedLogRunName ? [selectedLogRunName] : []}
                        onChange={handleLogRunSelectionChange}
                        size={5}
                        filter
                    />
                </PendingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Log Curves" expanded>
                <PendingWrapper
                    isPending={wellboreLogCurveHeaders.isFetching}
                    errorMessage={logCurveHeadersErrorMessage}
                >
                    <Select
                        options={makeLogCurveOptions(wellboreLogCurveHeaders.data ?? [], selectedLogRunName)}
                        value={selectedLogCurveNames}
                        onChange={handleLogCurvesSelectionChange}
                        size={5}
                        filter
                        multiple
                    />
                </PendingWrapper>
            </CollapsibleGroup>
        </>
    );
}

function makeDrilledWellHeaderOptions(drilledWellHeaders: WellBoreHeader_api[]): SelectOption[] {
    return drilledWellHeaders.map((header) => ({
        value: header.wellbore_uuid,
        label: header.unique_well_identifier,
    }));
}

function makeLogRunOptions(logCurveHeaders: WellboreLogCurveInfo_api[]): SelectOption[] {
    const validLogCurveHeaders = logCurveHeaders.filter((header) => header.log_name !== null);
    const allLogRunNames: string[] = validLogCurveHeaders.map((header) => header.log_name);
    // To set
    const uniqueLogRunNames = Array.from(new Set(allLogRunNames));
    return uniqueLogRunNames.map((logRunName) => ({
        value: logRunName,
        label: logRunName,
    }));
}

function makeLogCurveOptions(
    logCurveHeaders: WellboreLogCurveInfo_api[],
    selectedLogRun: string | null
): SelectOption[] {
    const validLogCurveHeaders = logCurveHeaders.filter((header) => header.log_name === selectedLogRun);
    return validLogCurveHeaders.map((header) => ({
        value: header.curve_name,
        label: header.curve_name,
    }));
}

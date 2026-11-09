import type { ReactNode } from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";
import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Setting } from "@lib/components/Setting";

import { getFieldIssueText } from "../../../utils/setupReadiness";
import { costDraftStatusAtom, costProfileAtom, stopOpexAfterLastProductionAtom } from "../../atoms/baseAtoms";
import { validSelectedEnsembleIdentAtom } from "../../atoms/persistableFixableAtoms";
import { evaluationHorizonStateAtom, isSourceLoadingAtom } from "../../atoms/sourceSnapshotAtoms";
import { ANNUAL_COSTS_DELTA_HELP, ANNUAL_COSTS_HELP, STOP_OPEX_HELP } from "../../helpTexts";
import { type SettingsSectionProps } from "../../settingsSections";
import { CostProfileEditor } from "../costProfileEditor";

export function CostsSection(props: SettingsSectionProps): ReactNode {
    const selectedEnsembleIdent = useAtomValue(validSelectedEnsembleIdentAtom);
    const [costProfile, setCostProfile] = useAtom(costProfileAtom);
    const setCostDraftStatus = useSetAtom(costDraftStatusAtom);
    const evaluationHorizon = useAtomValue(evaluationHorizonStateAtom);
    const isSourceLoading = useAtomValue(isSourceLoadingAtom);
    const [stopOpexAfterLastProduction, setStopOpexAfterLastProduction] = useAtom(stopOpexAfterLastProductionAtom);

    const isDeltaEnsembleSelected =
        selectedEnsembleIdent !== null && isEnsembleIdentOfType(selectedEnsembleIdent, DeltaEnsembleIdent);

    return (
        <Setting.Section {...props.sectionProps}>
            <Setting.Field
                label="Annual costs"
                contentClassName="min-w-0"
                warningAnnotation={getFieldIssueText(props.readiness, "costs")}
                help={{
                    title: "Annual costs",
                    content: isDeltaEnsembleSelected ? ANNUAL_COSTS_DELTA_HELP : ANNUAL_COSTS_HELP,
                }}
                stacked
            >
                <CostProfileEditor
                    ensembleKey={selectedEnsembleIdent?.toString()}
                    value={costProfile}
                    isDelta={isDeltaEnsembleSelected}
                    horizon={evaluationHorizon}
                    isSourceLoading={isSourceLoading}
                    onValueChange={setCostProfile}
                    onDraftStatusChange={setCostDraftStatus}
                />
            </Setting.Field>
            {!isDeltaEnsembleSelected && (
                // Label-less, so the checkbox is named by its own label rather than the field's.
                <Setting.Field help={{ title: "Stop OPEX after last production", content: STOP_OPEX_HELP }}>
                    <CheckboxCompositions.WithLabel
                        label="Stop OPEX after last production"
                        checked={stopOpexAfterLastProduction}
                        onCheckedChange={setStopOpexAfterLastProduction}
                        size="small"
                    />
                </Setting.Field>
            )}
        </Setting.Section>
    );
}

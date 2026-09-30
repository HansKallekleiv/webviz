import React from "react";

import type { CaseSelection } from "@framework/internal/components/SelectEnsemblesDialog/private-components/CaseExplorer/CaseExplorer";
import { CaseExplorer } from "@framework/internal/components/SelectEnsemblesDialog/private-components/CaseExplorer/CaseExplorer";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";

import { AppProviders } from "./AppProviders";

type Props = {
    queriesDisabled?: boolean;
};

const NO_ENSEMBLES: UserEnsembleSetting[] = [];

function formatSelection(selection: CaseSelection | null): string {
    if (!selection) {
        return "none";
    }
    return `${selection.caseUuid}:${selection.filteredEnsembles.map((e) => e.name).join(",")}`;
}

export function CaseExplorerHarness(props: Props): React.JSX.Element {
    const [selection, setSelection] = React.useState<CaseSelection | null>(null);

    return (
        <AppProviders>
            <div className="w-full">
                <div className="h-[500px]">
                    <CaseExplorer
                        queriesDisabled={props.queriesDisabled ?? false}
                        ensembleSelection={NO_ENSEMBLES}
                        newEnsembleSelection={NO_ENSEMBLES}
                        onCaseSelectionChange={setSelection}
                    />
                </div>
                <div data-testid="case-selection">{formatSelection(selection)}</div>
            </div>
        </AppProviders>
    );
}

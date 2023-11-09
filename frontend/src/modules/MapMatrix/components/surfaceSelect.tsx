import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { useValidState } from "@lib/hooks/useValidState";
import { SurfaceDirectory, TimeType } from "@modules/_shared/Surface";

import { EnsembleSelectWithButtons } from "./ensembleSelectWithButtons";
import { SingleRealizationSelectWithButtons } from "./singleRealizationSelectWithButtons";
import { SingleSelectWithButtons } from "./singleSelectWithButtons";

import { EnsembleSetSurfaceMetas } from "../hooks/useEnsembleSetSurfaceMetaQuery";
import { SurfaceSelection, SyncedSettings } from "../settings";

export type SurfaceSelectProps = {
    surfaceMetas: EnsembleSetSurfaceMetas;
    surfaceSelection: SurfaceSelection;
    ensembleSet: EnsembleSet;
    timeType: TimeType;
    attributeType: SurfaceAttributeType_api;
    syncedSettings: SyncedSettings;
    onChange: (surfaceSelection: SurfaceSelection) => void;
};

export const SurfaceSelect: React.FC<SurfaceSelectProps> = (props) => {
    const [prevSurfaceMetas, setPrevSurfaceMetas] = React.useState<EnsembleSetSurfaceMetas>(props.surfaceMetas);

    let computedEnsembleIdent = props.surfaceSelection.ensembleIdent;
    if (
        !computedEnsembleIdent ||
        !props.ensembleSet.getEnsembleArr().some((el) => el.getIdent().equals(computedEnsembleIdent))
    ) {
        computedEnsembleIdent = props.ensembleSet.getEnsembleArr()[0]?.getIdent();
    }

    const ensembleSurfaceMetadata = computedEnsembleIdent
        ? props.surfaceMetas.data.find((ensembleSurfaceSet) =>
              ensembleSurfaceSet.ensembleIdent.equals(computedEnsembleIdent)
          )
        : undefined;

    const ensembleSurfaceDirectory = new SurfaceDirectory({
        surfaceMetas: ensembleSurfaceMetadata?.surfaceMetas ?? [],
        timeType: props.timeType,
        includeAttributeTypes: [props.attributeType],
    });

    let computedSurfaceName = props.surfaceSelection.surfaceName;
    if (!computedSurfaceName || !ensembleSurfaceDirectory.getSurfaceNames(null).includes(computedSurfaceName)) {
        computedSurfaceName = ensembleSurfaceDirectory.getSurfaceNames(null)[0];
    }

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        props.onChange({ ...props.surfaceSelection, ensembleIdent });
    }

    function handleSurfaceNameChange(surfaceName: string) {
        props.onChange({ ...props.surfaceSelection, surfaceName });
    }

    return (
        <>
            {!props.syncedSettings.ensemble && (
                <EnsembleSelectWithButtons
                    name="Ensemble"
                    ensembleSet={props.ensembleSet}
                    controlledValue={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            )}
            <SingleSelectWithButtons
                name="Surface name"
                options={ensembleSurfaceDirectory.getSurfaceNames(null)}
                value={computedSurfaceName}
                onChange={handleSurfaceNameChange}
            />
        </>
    );
};

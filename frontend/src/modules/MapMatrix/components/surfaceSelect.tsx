import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { Button } from "@lib/components/Button";
import { IconButton } from "@lib/components/IconButton";
import { useValidState } from "@lib/hooks/useValidState";
import { SurfaceDirectory, TimeType } from "@modules/_shared/Surface";
import { Remove } from "@mui/icons-material";

import { isEqual } from "lodash";

import { EnsembleSelectWithButtons } from "./ensembleSelectWithButtons";
import { SingleRealizationSelectWithButtons } from "./singleRealizationSelectWithButtons";
import { SingleSelectWithButtons } from "./singleSelectWithButtons";

import { isoStringToDateOrIntervalLabel } from "../_utils/isoString";
import { EnsembleSetSurfaceMetas } from "../hooks/useEnsembleSetSurfaceMetaQuery";
import { SurfaceSelection, SyncedSettings } from "../settings";

export type SurfaceSelectProps = {
    index: number;
    surfaceMetas: EnsembleSetSurfaceMetas;
    surfaceSelection: SurfaceSelection;
    ensembleSet: EnsembleSet;
    timeType: TimeType;
    attributeType: SurfaceAttributeType_api;
    syncedSettings: SyncedSettings;
    onChange: (surfaceSelection: SurfaceSelection) => void;
    onRemove: (uuid: string) => void;
};

export const SurfaceSelect: React.FC<SurfaceSelectProps> = (props) => {
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

    let computedSurfaceAttribute = props.surfaceSelection.surfaceAttribute;
    if (
        !computedSurfaceAttribute ||
        !ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName).includes(computedSurfaceAttribute)
    ) {
        computedSurfaceAttribute = ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName)[0];
    }
    let computedTimeOrInterval = props.surfaceSelection.surfaceTimeOrInterval;
    if (
        !computedTimeOrInterval ||
        !ensembleSurfaceDirectory
            .getTimeOrIntervalStrings(computedSurfaceName, computedSurfaceAttribute)
            .includes(computedTimeOrInterval)
    ) {
        computedTimeOrInterval = ensembleSurfaceDirectory.getTimeOrIntervalStrings(
            computedSurfaceName,
            computedSurfaceAttribute
        )[0];
    }
    let computedRealizationNum = props.surfaceSelection.realizationNum;
    const availableRealizationNums =
        props.ensembleSet
            .findEnsemble(computedEnsembleIdent)
            ?.getRealizations()
            .map((real) => real) ?? [];

    if (!computedRealizationNum || !availableRealizationNums.includes(computedRealizationNum)) {
        computedRealizationNum = availableRealizationNums[0];
    }
    const computedSurfaceSelection: SurfaceSelection = {
        ensembleIdent: computedEnsembleIdent,
        surfaceName: computedSurfaceName,
        surfaceAttribute: computedSurfaceAttribute,
        surfaceTimeOrInterval: computedTimeOrInterval,
        realizationNum: computedRealizationNum,
        uuid: props.surfaceSelection.uuid,
    };

    if (!isEqual(props.surfaceSelection, computedSurfaceSelection)) {
        props.onChange(computedSurfaceSelection);
    }
    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        props.onChange({ ...props.surfaceSelection, ensembleIdent });
    }

    function handleSurfaceNameChange(surfaceName: string) {
        props.onChange({ ...props.surfaceSelection, surfaceName });
    }
    function handleSurfaceAttributeChange(surfaceAttribute: string) {
        props.onChange({ ...props.surfaceSelection, surfaceAttribute });
    }
    function handleSurfaceTimeOrIntervalChange(surfaceTimeOrInterval: string) {
        props.onChange({ ...props.surfaceSelection, surfaceTimeOrInterval });
    }
    function handleRealizationNumChange(realizationNum: number) {
        props.onChange({ ...props.surfaceSelection, realizationNum });
    }
    function handleRemove() {
        props.onRemove(props.surfaceSelection.uuid);
    }
    return (
        <>
            {" "}
            <tr className="bg-slate-100">
                <td className="px-6 py-0 whitespace-nowrap">{`Surface ${props.index + 1}`}</td>
                <td></td>
                <td>
                    <IconButton className="float-right" onClick={handleRemove} color="danger" title="Remove surface">
                        <Remove fontSize="large" />
                    </IconButton>
                </td>
            </tr>
            {(!props.syncedSettings.ensemble || props.index == 0) && (
                <EnsembleSelectWithButtons
                    name="Ensemble"
                    ensembleSet={props.ensembleSet}
                    controlledValue={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            )}
            {(!props.syncedSettings.name || props.index == 0) && (
                <SingleSelectWithButtons
                    name="Name"
                    options={ensembleSurfaceDirectory.getSurfaceNames(null)}
                    value={computedSurfaceName}
                    onChange={handleSurfaceNameChange}
                />
            )}
            {(!props.syncedSettings.attribute || props.index == 0) && (
                <SingleSelectWithButtons
                    name="Attribute"
                    options={ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName)}
                    value={computedSurfaceAttribute}
                    onChange={handleSurfaceAttributeChange}
                />
            )}
            {(!props.syncedSettings.timeOrInterval || props.index == 0) && props.timeType !== TimeType.None && (
                <SingleSelectWithButtons
                    name="Time/Interval"
                    options={ensembleSurfaceDirectory.getTimeOrIntervalStrings(
                        computedSurfaceName,
                        computedSurfaceAttribute
                    )}
                    value={computedTimeOrInterval}
                    labelFunction={isoStringToDateOrIntervalLabel}
                    onChange={handleSurfaceTimeOrIntervalChange}
                />
            )}
            {(!props.syncedSettings.realizationNum || props.index == 0) && (
                <SingleSelectWithButtons
                    name="Realization"
                    options={availableRealizationNums.map((num) => num.toString())}
                    value={computedRealizationNum.toString()}
                    onChange={(value: string) => handleRealizationNumChange(parseInt(value))}
                />
            )}
        </>
    );
};

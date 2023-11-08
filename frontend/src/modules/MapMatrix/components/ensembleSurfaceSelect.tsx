import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { IconButton } from "@lib/components/IconButton";
import { useValidState } from "@lib/hooks/useValidState";
import { TimeType } from "@modules/_shared/Surface";
import { SurfaceAddress, SurfaceAddressFactory } from "@modules/_shared/Surface";
import { EmergencyShare, Remove } from "@mui/icons-material";

import { EnsembleSelectWithButtons } from "./ensembleSelectWithButtons";
import { SingleRealizationSelectWithButtons } from "./singleRealizationSelectWithButtons";
import { SingleSelectWithButtons } from "./singleSelectWithButtons";

import { isoIntervalStringToDateLabel, isoStringToDateLabel } from "../_utils/isoString";
import { useEnsembleSetSurfaceMetaData } from "../hooks/useEnsembleSetSurfaceMetaData";
import { EnsembleSetSurfaceMetas } from "../hooks/useEnsembleSetSurfaceMetaQuery";
import { useEnsembleSurfaceDirectory } from "../hooks/useEnsembleSurfaceDirectory";

export type EnsembleSurfaceSelectProps = {
    ensembleSetSurfaceMetas: EnsembleSetSurfaceMetas;
    surfaceAttributeTypes: SurfaceAttributeType_api[];
    controlledSurfaceName?: string;
    controlledSurfaceAttribute?: string;
    controlledSurfaceTimeOrInterval?: string | null;
    controlledRealizationNum?: number;
    controlledStage?: Stage;
    timeType: TimeType;
    workbenchSession: WorkbenchSession;
    onAddressChange?: (surfaceAddress: SurfaceAddress) => void;
    id: string;
    index: number;
    onRemove: (id: string) => void;
};
const TimeTypeEnumToStringMapping = {
    [TimeType.None]: "Static",
    [TimeType.TimePoint]: "Time point",
    [TimeType.Interval]: "Time interval",
};
enum GroupBy {
    Realization = "Real",
    Ensemble = "Ensemble",
    Name = "Name",
    Attribute = "Attribute",
    Time = "Time",
    Stage = "Stage",
}

enum Stage {
    Realization = "Realization",
    Ensemble = "Ensemble statistics",
    Observation = "Observation",
}

export const EnsembleSurfaceSelect: React.FC<EnsembleSurfaceSelectProps> = (props) => {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const firstEnsemble = useFirstEnsembleInEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(
        firstEnsemble?.getIdent() ?? null
    );

    const [stage, setStage] = React.useState<Stage>(Stage.Realization);

    const ensembleSetSurfaceMetaData = useEnsembleSetSurfaceMetaData(props.ensembleSetSurfaceMetas);
    console.log(ensembleSetSurfaceMetaData);
    const ensembleSurfaceDirectory = useEnsembleSurfaceDirectory({
        surfaceMetas: ensembleSetSurfaceMetaData.getEnsembleSurfaceMeta(selectedEnsembleIdent),
        timeType: props.timeType,
        includeAttributeTypes: props.surfaceAttributeTypes,
    });
    console.log("ensembleSurfaceDirectory", ensembleSurfaceDirectory.getSurfaceNames(null));
    const [surfaceName, setSurfaceName] = useValidState<string>("", ensembleSurfaceDirectory.getSurfaceNames(null));

    const [surfaceAttribute, setSurfaceAttribute] = useValidState<string>(
        "",
        ensembleSurfaceDirectory.getAttributeNames(props.controlledSurfaceName || surfaceName)
    );

    const [surfaceTimeOrInterval, setSurfaceTimeOrInterval] = useValidState<string>(
        "",
        ensembleSurfaceDirectory.getTimeOrIntervalStrings(
            props.controlledSurfaceName || surfaceName,
            props.controlledSurfaceAttribute || surfaceAttribute
        )
    );
    const [realizationNum, setRealizationNum] = React.useState<number>(0);

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }

    function handleStageChange(val: string) {
        setStage(val as Stage);
    }
    const computedSurfaceName = fixupPossibleControlledValue(
        surfaceName,
        props.controlledSurfaceName,
        ensembleSurfaceDirectory.getSurfaceNames(null)
    );
    if (computedSurfaceName !== surfaceName) {
        setSurfaceName(computedSurfaceName);
    }
    const computedSurfaceAttribute = fixupPossibleControlledValue(
        surfaceAttribute,
        props.controlledSurfaceAttribute,
        ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName)
    );
    if (computedSurfaceAttribute !== surfaceAttribute) {
        setSurfaceAttribute(computedSurfaceAttribute);
    }
    const computedSurfaceTimeOrInterval = fixupPossibleControlledValue(
        surfaceTimeOrInterval,
        props.controlledSurfaceTimeOrInterval,
        ensembleSurfaceDirectory.getTimeOrIntervalStrings(computedSurfaceName, computedSurfaceAttribute)
    );
    console.log("updated");
    React.useEffect(
        function onChange() {
            const finalSurfaceName = props.controlledSurfaceName || surfaceName;
            const finalSurfaceAttribute = props.controlledSurfaceAttribute || surfaceAttribute;
            const finalSurfaceTimeOrInterval =
                props.controlledSurfaceTimeOrInterval !== undefined
                    ? props.controlledSurfaceTimeOrInterval
                    : surfaceTimeOrInterval;
            if (props.onAddressChange && selectedEnsembleIdent && finalSurfaceName && finalSurfaceAttribute) {
                const factory = new SurfaceAddressFactory(
                    selectedEnsembleIdent.getCaseUuid(),
                    selectedEnsembleIdent.getEnsembleName(),
                    finalSurfaceName,
                    finalSurfaceAttribute,
                    surfaceTimeOrInterval.length ? finalSurfaceTimeOrInterval : null
                );
                if (stage === Stage.Realization) {
                    props.onAddressChange(
                        factory.createRealizationAddress(props.controlledRealizationNum || realizationNum)
                    );
                } else if (stage === Stage.Ensemble) {
                    props.onAddressChange(factory.createStatisticalAddress(SurfaceStatisticFunction_api.MEAN));
                }
            }
        },
        [
            selectedEnsembleIdent,
            props.controlledSurfaceName,
            props.controlledSurfaceAttribute,
            props.controlledSurfaceTimeOrInterval,
            props.controlledRealizationNum,
            surfaceAttribute,
            surfaceName,
            surfaceTimeOrInterval,
            stage,
            realizationNum,
        ]
    );

    return (
        <>
            <tr className="bg-slate-100">
                <td className="px-6 py-0 whitespace-nowrap">{`Surface ${props.index + 1}`}</td>
                <td></td>

                <td>
                    <IconButton
                        className="float-right"
                        onClick={() => props.onRemove(props.id)}
                        color="danger"
                        title="Remove surface"
                    >
                        <Remove fontSize="large" />
                    </IconButton>
                </td>
            </tr>

            <EnsembleSelectWithButtons
                name={GroupBy.Ensemble}
                ensembleSet={ensembleSet}
                controlledValue={selectedEnsembleIdent}
                onChange={handleEnsembleSelectionChange}
            />
            {!props.controlledSurfaceName && (
                <SingleSelectWithButtons
                    name={GroupBy.Name}
                    options={ensembleSurfaceDirectory.getSurfaceNames(null)}
                    onChange={setSurfaceName}
                    controlledValue={surfaceName}
                />
            )}
            {!props.controlledSurfaceAttribute && (
                <SingleSelectWithButtons
                    name={GroupBy.Attribute}
                    options={ensembleSurfaceDirectory.getAttributeNames(props.controlledSurfaceName || surfaceName)}
                    onChange={setSurfaceAttribute}
                    controlledValue={surfaceAttribute}
                />
            )}
            {props.controlledSurfaceTimeOrInterval === undefined && props.timeType != TimeType.None && (
                <SingleSelectWithButtons
                    name={GroupBy.Time}
                    options={ensembleSurfaceDirectory.getTimeOrIntervalStrings(
                        props.controlledSurfaceName || surfaceName,
                        props.controlledSurfaceAttribute || surfaceAttribute
                    )}
                    labelFunction={
                        props.timeType == TimeType.TimePoint ? isoStringToDateLabel : isoIntervalStringToDateLabel
                    }
                    onChange={setSurfaceTimeOrInterval}
                    controlledValue={surfaceTimeOrInterval || ""}
                />
            )}

            {/* <SingleSelectWithButtons name={GroupBy.Stage} options={Object.values(Stage)} onChange={handleStageChange} /> */}
            {props.controlledRealizationNum === undefined && stage === Stage.Realization && (
                <SingleRealizationSelectWithButtons
                    ensemble={selectedEnsembleIdent ? ensembleSet.findEnsemble(selectedEnsembleIdent) : null}
                    onChange={setRealizationNum}
                    controlledValue={realizationNum}
                />
            )}
        </>
    );
};

function fixupPossibleControlledValue(
    value: string | null,
    possibleControlledValue: string | null | undefined,
    possibleValues: string[]
): string {
    if (
        possibleControlledValue !== undefined &&
        possibleControlledValue !== null &&
        possibleValues.includes(possibleControlledValue)
    ) {
        return possibleControlledValue;
    }
    if (value === null && possibleValues.length > 0) {
        return possibleValues[0];
    }
    return value ?? "";
}

import React from "react";

import { SurfaceAttributeType_api, SurfaceMeta_api } from "@api";
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

import { isEqual } from "lodash";

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
    controlledEnsembleIdent?: { caseUuid: string; ensembleName: string } | null;
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
    const [ensembleSetSurfaceMetaData, setEnsembleSetSurfaceMetaData] = React.useState<{
        ensembleIdent: EnsembleIdent;
        surfaceMetas?: SurfaceMeta_api[];
    } | null>(null);

    const firstEnsemble = useFirstEnsembleInEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(
        firstEnsemble?.getIdent() ?? null
    );
    const computedEnsembleIdent = fixupPossibleControlledEnsembleIdentValue(
        selectedEnsembleIdent,
        EnsembleIdent.fromCaseUuidAndEnsembleName(
            props.controlledEnsembleIdent?.caseUuid ?? "",
            props.controlledEnsembleIdent?.ensembleName ?? ""
        ),
        ensembleSet.getEnsembleArr().map((ens) => ens.getIdent())
    );

    if (computedEnsembleIdent?.toString() != selectedEnsembleIdent?.toString()) {
        console.log("Ensemble changed", computedEnsembleIdent?.toString(), selectedEnsembleIdent?.toString());
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    const computedEnsembleSurfaceMetaData = props.ensembleSetSurfaceMetas.data.find(
        (ensembleSurfaceSet) => ensembleSurfaceSet.ensembleIdent === computedEnsembleIdent
    );

    if (
        !props.ensembleSetSurfaceMetas.isFetching &&
        props.ensembleSetSurfaceMetas.data.length > 0 &&
        computedEnsembleSurfaceMetaData &&
        !isEqual(computedEnsembleSurfaceMetaData, ensembleSetSurfaceMetaData)
    ) {
        console.log("Ensemble surface metadata changed", computedEnsembleSurfaceMetaData, ensembleSetSurfaceMetaData);
        setEnsembleSetSurfaceMetaData(computedEnsembleSurfaceMetaData);
    }
    const [stage, setStage] = React.useState<Stage>(Stage.Realization);

    const ensembleSurfaceDirectory = useEnsembleSurfaceDirectory({
        surfaceMetas: ensembleSetSurfaceMetaData?.surfaceMetas ?? [],
        timeType: props.timeType,
        includeAttributeTypes: props.surfaceAttributeTypes,
    });

    const [surfaceName, setSurfaceName] = useValidState<string>("", ensembleSurfaceDirectory.getSurfaceNames(null));

    const [surfaceAttribute, setSurfaceAttribute] = useValidState<string>(
        "",
        ensembleSurfaceDirectory.getAttributeNames(props.controlledSurfaceName || surfaceName)
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
    if (computedSurfaceName != surfaceName) {
        console.log("Surface name changed", computedSurfaceName, surfaceName);
        setSurfaceName(computedSurfaceName);
    }
    const computedSurfaceAttribute = fixupPossibleControlledValue(
        surfaceAttribute,
        props.controlledSurfaceAttribute,
        ensembleSurfaceDirectory.getAttributeNames(computedSurfaceName)
    );
    if (computedSurfaceAttribute != surfaceAttribute) {
        console.log("Surface attribute changed", computedSurfaceAttribute, surfaceAttribute);
        setSurfaceAttribute(computedSurfaceAttribute);
    }
    const [surfaceTimeOrInterval, setSurfaceTimeOrInterval] = useValidState<string | null>(
        "",
        ensembleSurfaceDirectory.getTimeOrIntervalStrings(computedSurfaceName, computedSurfaceAttribute)
    );
    const computedSurfaceTimeOrInterval = fixupPossibleControlledValue(
        surfaceTimeOrInterval,
        props.controlledSurfaceTimeOrInterval,
        ensembleSurfaceDirectory.getTimeOrIntervalStrings(computedSurfaceName, computedSurfaceAttribute)
    );

    if (computedSurfaceTimeOrInterval != surfaceTimeOrInterval) {
        console.log("Surface time changed", computedSurfaceTimeOrInterval, surfaceTimeOrInterval);
        setSurfaceTimeOrInterval(computedSurfaceTimeOrInterval);
    }
    const computedRealizationNum = fixupPossibleControlledValue(
        realizationNum,
        props.controlledRealizationNum,
        ensembleSet
            ?.getEnsembleArr()
            .find((ens) => ens.getIdent().equals(computedEnsembleIdent))
            ?.getRealizations()
            .map((real) => real) ?? []
    );
    if (computedRealizationNum != realizationNum) {
        console.log("Realization num changed", computedRealizationNum, realizationNum);
        setRealizationNum(computedRealizationNum);
    }

    React.useEffect(
        function onChange() {
            console.log("Something changed");
            const finalEnsembleIdent = computedEnsembleIdent;
            const finalSurfaceName = props.controlledSurfaceName || surfaceName;
            const finalSurfaceAttribute = props.controlledSurfaceAttribute || surfaceAttribute;
            const finalSurfaceTimeOrInterval = fixupPossibleControlledValue(
                surfaceTimeOrInterval,
                props.controlledSurfaceTimeOrInterval,
                ensembleSurfaceDirectory.getTimeOrIntervalStrings(computedSurfaceName, computedSurfaceAttribute)
            );
            if (
                props.onAddressChange &&
                finalEnsembleIdent &&
                finalSurfaceName &&
                finalSurfaceAttribute &&
                finalSurfaceTimeOrInterval !== undefined
            ) {
                const factory = new SurfaceAddressFactory(
                    finalEnsembleIdent.getCaseUuid(),
                    finalEnsembleIdent.getEnsembleName(),
                    finalSurfaceName,
                    finalSurfaceAttribute,
                    finalSurfaceTimeOrInterval.length > 0 ? finalSurfaceTimeOrInterval : null
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
            computedEnsembleIdent,
            computedSurfaceName,
            computedSurfaceAttribute,
            computedSurfaceTimeOrInterval,
            computedRealizationNum,
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
            {!props.controlledEnsembleIdent && (
                <EnsembleSelectWithButtons
                    name={GroupBy.Ensemble}
                    ensembleSet={ensembleSet}
                    controlledValue={selectedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            )}
            {!props.controlledSurfaceName && (
                <SingleSelectWithButtons
                    name={GroupBy.Name}
                    options={ensembleSurfaceDirectory.getSurfaceNames(null)}
                    onChange={setSurfaceName}
                    value={surfaceName}
                />
            )}
            {!props.controlledSurfaceAttribute && (
                <SingleSelectWithButtons
                    name={GroupBy.Attribute}
                    options={ensembleSurfaceDirectory.getAttributeNames(props.controlledSurfaceName || surfaceName)}
                    onChange={setSurfaceAttribute}
                    value={surfaceAttribute}
                />
            )}
            {props.controlledSurfaceTimeOrInterval === undefined && props.timeType != TimeType.None && (
                <SingleSelectWithButtons
                    name={GroupBy.Time}
                    options={ensembleSurfaceDirectory.getTimeOrIntervalStrings(
                        props.controlledSurfaceName || computedSurfaceName,
                        props.controlledSurfaceAttribute || computedSurfaceAttribute
                    )}
                    labelFunction={
                        props.timeType == TimeType.TimePoint ? isoStringToDateLabel : isoIntervalStringToDateLabel
                    }
                    onChange={setSurfaceTimeOrInterval}
                    value={surfaceTimeOrInterval || ""}
                />
            )}

            {/* <SingleSelectWithButtons name={GroupBy.Stage} options={Object.values(Stage)} onChange={handleStageChange} /> */}
            {props.controlledRealizationNum === undefined && stage === Stage.Realization && (
                <SingleRealizationSelectWithButtons
                    ensemble={computedEnsembleIdent ? ensembleSet.findEnsemble(computedEnsembleIdent) : null}
                    onChange={setRealizationNum}
                    value={realizationNum}
                />
            )}
        </>
    );
};

function fixupPossibleControlledValue<T extends string | number>(
    value: T | null,
    possibleControlledValue: T | null | undefined,
    possibleValues: T[]
): T {
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

    return (value === null ? "" : value) as T;
}

function fixupPossibleControlledEnsembleIdentValue(
    value: EnsembleIdent | null,
    possibleControlledValue: EnsembleIdent | null | undefined,
    possibleValues: EnsembleIdent[]
): EnsembleIdent | null {
    if (
        possibleControlledValue !== undefined &&
        possibleControlledValue !== null &&
        possibleValues.some((ident) => ident.equals(possibleControlledValue))
    ) {
        return possibleControlledValue;
    }
    if (value === null && possibleValues.length > 0) {
        return possibleValues[0];
    }
    return value ?? null;
}

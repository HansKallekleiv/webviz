import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { useValidState } from "@lib/hooks/useValidState";
import { TimeType } from "@modules/_shared/Surface";
import { SurfaceAddress, SurfaceAddressFactory } from "@modules/_shared/Surface";

import { SingleRealizationSelectWithButtons } from "./singleRealizationSelectWithButtons";
import { SingleSelectWithButtons } from "./singleSelectWithButtons";

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
};
const TimeTypeEnumToStringMapping = {
    [TimeType.None]: "Static",
    [TimeType.TimePoint]: "Time point",
    [TimeType.Interval]: "Time interval",
};
enum GroupBy {
    Realization = "Realization",
    Ensemble = "Ensemble",
    Name = "Horizon / Zone",
    Attribute = "Attribute",
    Time = "Time point / interval",
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

    const ensembleSurfaceDirectory = useEnsembleSurfaceDirectory({
        surfaceMetas: ensembleSetSurfaceMetaData.getEnsembleSurfaceMeta(selectedEnsembleIdent),
        timeType: props.timeType,
        includeAttributeTypes: props.surfaceAttributeTypes,
    });
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
        <div>
            Ensemble
            <SingleEnsembleSelect
                ensembleSet={ensembleSet}
                value={selectedEnsembleIdent}
                onChange={handleEnsembleSelectionChange}
            />
            {!props.controlledSurfaceName && (
                <SingleSelectWithButtons
                    name={GroupBy.Name}
                    options={ensembleSurfaceDirectory.getSurfaceNames(null)}
                    onChange={setSurfaceName}
                    controlledValue={props.controlledSurfaceName}
                />
            )}
            {!props.controlledSurfaceAttribute && (
                <SingleSelectWithButtons
                    name={GroupBy.Attribute}
                    options={ensembleSurfaceDirectory.getAttributeNames(props.controlledSurfaceName || surfaceName)}
                    onChange={setSurfaceAttribute}
                    controlledValue={props.controlledSurfaceAttribute}
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
                    controlledValue={props.controlledSurfaceTimeOrInterval || ""}
                />
            )}
            <SingleSelectWithButtons name={GroupBy.Stage} options={Object.values(Stage)} onChange={handleStageChange} />
            {props.controlledRealizationNum === undefined && stage === Stage.Realization && (
                <SingleRealizationSelectWithButtons
                    ensemble={selectedEnsembleIdent ? ensembleSet.findEnsemble(selectedEnsembleIdent) : null}
                    onChange={setRealizationNum}
                    controlledValue={props.controlledRealizationNum}
                />
            )}
        </div>
    );
};

function isoStringToDateLabel(input: string): string {
    const date = input.split("T")[0];
    return `${date}`;
}

function isoIntervalStringToDateLabel(input: string): string {
    const [start, end] = input.split("/");
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    return `${startDate}/${endDate}`;
}

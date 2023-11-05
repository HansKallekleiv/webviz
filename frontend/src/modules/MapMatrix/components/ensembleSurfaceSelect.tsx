import React from "react";

import { SurfaceAttributeType_api, SurfaceMeta_api } from "@api";
import { SurfaceStatisticFunction_api } from "@api";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";
import { useValidState } from "@lib/hooks/useValidState";
import { TimeType } from "@modules/_shared/Surface";
import { SurfaceAddress, SurfaceAddressFactory } from "@modules/_shared/Surface";

import { MultiSelect } from "./multiSelect";
import { SingleRealizationSelect } from "./singleRealizationSelect";
import { SingleSelect } from "./singleSelect";

import { useEnsembleSetSurfaceMetaData } from "../hooks/useEnsembleSetSurfaceMetaData";
import { EnsembleSetSurfaceMetas } from "../hooks/useEnsembleSetSurfaceMetaQuery";
import { useEnsembleSurfaceDirectory } from "../hooks/useEnsembleSurfaceDirectory";

export type EnsembleSurfaceSelectProps = {
    ensembleSetSurfaceMetas: EnsembleSetSurfaceMetas;
    workbenchSession: WorkbenchSession;
    onChange?: (surfaceAddress: SurfaceAddress) => void;
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

    const [timeType, setTimeType] = React.useState<TimeType>(TimeType.None);

    const [stage, setStage] = React.useState<Stage>(Stage.Realization);

    const [surfaceAttributeTypes, setSurfaceAttributeTypes] = React.useState<SurfaceAttributeType_api[]>([
        SurfaceAttributeType_api.DEPTH,
    ]);
    const ensembleSetSurfaceMetaData = useEnsembleSetSurfaceMetaData(props.ensembleSetSurfaceMetas);

    const ensembleSurfaceDirectory = useEnsembleSurfaceDirectory({
        surfaceMetas: ensembleSetSurfaceMetaData.getEnsembleSurfaceMeta(selectedEnsembleIdent),
        timeType: timeType,
        includeAttributeTypes: surfaceAttributeTypes,
    });

    const [surfaceAttribute, setSurfaceAttribute] = useValidState<string>(
        "",
        ensembleSurfaceDirectory.getAttributeNames(null)
    );
    const [surfaceName, setSurfaceName] = useValidState<string>("", ensembleSurfaceDirectory.getSurfaceNames(null));

    const [surfaceTimeOrInterval, setSurfaceTimeOrInterval] = useValidState<string>(
        "",
        ensembleSurfaceDirectory.getTimeOrIntervalStrings(null, null)
    );
    const [realizationNum, setRealizationNum] = React.useState<number>(0);

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }
    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeType(event.target.value as TimeType);
    }

    function handleSurfaceAttributeTypeChange(vals: string[]) {
        setSurfaceAttributeTypes(vals as SurfaceAttributeType_api[]);
    }
    function handleStageChange(val: string) {
        setStage(val as Stage);
    }

    React.useEffect(
        function onChange() {
            if (props.onChange && selectedEnsembleIdent && surfaceAttribute && surfaceName) {
                const factory = new SurfaceAddressFactory(
                    selectedEnsembleIdent.getCaseUuid(),
                    selectedEnsembleIdent.getEnsembleName(),
                    surfaceName,
                    surfaceAttribute,
                    surfaceTimeOrInterval.length ? surfaceTimeOrInterval : null
                );
                if (stage === Stage.Realization) {
                    props.onChange(factory.createRealizationAddress(realizationNum));
                } else if (stage === Stage.Ensemble) {
                    props.onChange(factory.createStatisticalAddress(SurfaceStatisticFunction_api.MEAN));
                }
            }
        },
        [selectedEnsembleIdent, surfaceAttribute, surfaceName, surfaceTimeOrInterval, stage, realizationNum]
    );

    return (
        <div>
            Time mode:
            <RadioGroup
                value={timeType}
                direction="horizontal"
                options={Object.values(TimeType).map((val: TimeType) => {
                    return { value: val, label: TimeTypeEnumToStringMapping[val] };
                })}
                onChange={handleTimeModeChange}
            />
            <CollapsibleGroup expanded={false} title="Attribute type filter">
                <MultiSelect
                    name={"Surface attribute types"}
                    options={Object.values(SurfaceAttributeType_api)}
                    onChange={handleSurfaceAttributeTypeChange}
                    size={5}
                />
            </CollapsibleGroup>
            Ensemble
            <SingleEnsembleSelect
                ensembleSet={ensembleSet}
                value={selectedEnsembleIdent}
                onChange={handleEnsembleSelectionChange}
            />
            <SingleSelect
                name={GroupBy.Name}
                options={ensembleSurfaceDirectory.getSurfaceNames(null)}
                onChange={setSurfaceName}
                size={5}
            />
            <SingleSelect
                name={GroupBy.Attribute}
                options={ensembleSurfaceDirectory.getAttributeNames(null)}
                onChange={setSurfaceAttribute}
                size={5}
            />
            {timeType != TimeType.None && (
                <SingleSelect
                    name={GroupBy.Time}
                    options={ensembleSurfaceDirectory.getTimeOrIntervalStrings(null, null)}
                    labelFunction={timeType == TimeType.TimePoint ? isoStringToDateLabel : isoIntervalStringToDateLabel}
                    onChange={setSurfaceTimeOrInterval}
                    size={5}
                />
            )}
            <SingleSelect name={GroupBy.Stage} options={Object.values(Stage)} onChange={handleStageChange} size={5} />
            <SingleRealizationSelect
                ensemble={selectedEnsembleIdent ? ensembleSet.findEnsemble(selectedEnsembleIdent) : null}
                onChange={setRealizationNum}
                size={5}
            />
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

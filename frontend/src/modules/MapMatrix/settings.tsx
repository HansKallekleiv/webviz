import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleFCProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { useElementSize } from "@lib/hooks/useElementSize";

import { group } from "console";

import { SingleOrMultiSelect } from "./components/singleOrMultiSelect";
import { TimeType } from "./hooks/useEnsembleSetSurfaceDirectory";
import { useEnsembleSetSurfaceDirectory } from "./hooks/useEnsembleSetSurfaceDirectory";
import { useEnsembleSetSurfaceMetas } from "./hooks/useEnsembleSetSurfaceMetas";
import { State } from "./state";

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
export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = React.useState<EnsembleIdent[]>([]);
    const [groupBy, setGroupBy] = React.useState<GroupBy>(GroupBy.Realization);
    const [timeType, setTimeType] = React.useState<TimeType>(TimeType.None);
    if (groupBy === GroupBy.Time && timeType === TimeType.None) {
        setTimeType(TimeType.TimePoint);
    }
    const [stage, setStage] = React.useState<Stage>(Stage.Realization);

    const [surfaceAttributeTypes, setSurfaceAttributeTypes] = React.useState<SurfaceAttributeType_api[]>([
        SurfaceAttributeType_api.DEPTH,
    ]);
    const [surfaceAttributes, setSurfaceAttributes] = React.useState<string[]>([]);
    const [surfaceNames, setSurfaceNames] = React.useState<string[]>([]);
    const [surfaceTimeOrInterval, setSurfaceTimeOrInterval] = React.useState<string[]>([]);
    const [realizationNums, setRealizationNums] = React.useState<number[]>([]);
    const ensembleSet = useEnsembleSet(workbenchSession);

    React.useEffect(
        function setAvailableRealizations() {
            const reals: number[] =
                ensembleSet
                    .findEnsemble(selectedEnsembleIdents[0])
                    ?.getRealizations()
                    .map((real: number) => real) ?? [];
            setRealizationNums(reals);
        },
        [selectedEnsembleIdents]
    );

    const stateWriter = useSettingsStatusWriter(moduleContext);

    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetas(selectedEnsembleIdents);
    const ensembleSetSurfaceDirectory = useEnsembleSetSurfaceDirectory({
        ensembleSetSurfaceMetas: ensembleSetSurfaceMetas,
        timeType: timeType,
        includeAttributeTypes: surfaceAttributeTypes,
    });
    function handleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }
    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeType(event.target.value as TimeType);
    }
    function handleGroupByChange(val: string) {
        setGroupBy(val as GroupBy);
    }
    function handleSurfaceAttributeTypeChange(vals: string[]) {
        setSurfaceAttributeTypes(vals as SurfaceAttributeType_api[]);
    }
    function handleStageChange(vals: string[]) {
        setStage(vals[0] as Stage);
    }
    function handleRealizationsChange(vals: string[]) {
        setRealizationNums(vals.map((val: string) => parseInt(val)));
    }
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
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
                <SingleOrMultiSelect
                    multiple={true}
                    name={"Surface attribute types"}
                    options={Object.values(SurfaceAttributeType_api)}
                    onChange={handleSurfaceAttributeTypeChange}
                    size={5}
                />
                <br></br>
                Show surface for each:
                <Dropdown
                    value={groupBy}
                    options={Object.values(GroupBy).map((val: GroupBy) => {
                        return { value: val, label: val };
                    })}
                    onChange={handleGroupByChange}
                />
                Available ensembles:
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={selectedEnsembleIdents}
                    onChange={handleEnsembleSelectionChange}
                    size={5}
                />
                <SingleOrMultiSelect
                    multiple={groupBy == GroupBy.Name}
                    name={GroupBy.Name}
                    options={ensembleSetSurfaceDirectory.getSurfaceNames(
                        groupBy == GroupBy.Attribute ? null : surfaceAttributes.length ? surfaceAttributes[0] : null
                    )}
                    onChange={setSurfaceNames}
                    size={5}
                />
                <SingleOrMultiSelect
                    multiple={groupBy == GroupBy.Attribute}
                    name={GroupBy.Attribute}
                    options={ensembleSetSurfaceDirectory.getAttributeNames(null)}
                    onChange={setSurfaceAttributes}
                    size={5}
                />
                {timeType != TimeType.None && (
                    <SingleOrMultiSelect
                        multiple={groupBy == GroupBy.Time}
                        name={GroupBy.Time}
                        options={ensembleSetSurfaceDirectory.getTimeOrIntervalStrings(
                            groupBy == GroupBy.Name ? null : surfaceNames.length ? surfaceNames[0] : null,
                            groupBy == GroupBy.Attribute ? null : surfaceAttributes.length ? surfaceAttributes[0] : null
                        )}
                        labelFunction={
                            timeType == TimeType.TimePoint ? isoStringToDateLabel : isoIntervalStringToDateLabel
                        }
                        onChange={setSurfaceTimeOrInterval}
                        size={5}
                    />
                )}
                <SingleOrMultiSelect
                    multiple={groupBy == GroupBy.Stage}
                    name={GroupBy.Stage}
                    options={Object.values(Stage)}
                    onChange={handleStageChange}
                    size={5}
                />
                <SingleOrMultiSelect
                    multiple={stage != Stage.Realization || groupBy == GroupBy.Realization}
                    name={Stage.Realization}
                    options={realizationNums.map((real) => real.toString())}
                    onChange={handleStageChange}
                    size={5}
                />
            </div>
        </div>
    );
}

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

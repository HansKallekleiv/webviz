import React, { useState } from "react";

import { SurfaceAttributeType_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import { ToggleButton } from "@lib/components/ToggleButton";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { TimeType } from "@modules/_shared/Surface";

import { EnsembleSurfaceSelect } from "./components/ensembleSurfaceSelect";
import { LabelledSwitch } from "./components/labelledSwitch";
import { MultiSelect } from "./components/multiSelect";
import { useEnsembleSetSurfaceMetaQuery } from "./hooks/useEnsembleSetSurfaceMetaQuery";
import { State } from "./state";

const TimeTypeEnumToStringMapping = {
    [TimeType.None]: "Static",
    [TimeType.TimePoint]: "Time point",
    [TimeType.Interval]: "Time interval",
};
export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(
        ensembleSet.getEnsembleArr().map((ens) => ens.getIdent())
    );

    const [surfaceAddresses, setSurfaceAddresses] = useState<Array<SurfaceAddress | null>>([]);
    const [timeType, setTimeType] = React.useState<TimeType>(TimeType.None);
    const [surfaceAttributeTypes, setSurfaceAttributeTypes] = React.useState<SurfaceAttributeType_api[]>(
        Object.values(SurfaceAttributeType_api)
    );
    const [isControlledSurfaceName, setIsControlledSurfaceName] = React.useState<boolean>(false);
    const [isControlledSurfaceAttribute, setIsControlledSurfaceAttribute] = React.useState<boolean>(false);
    const [isControlledSurfaceTimeOrInterval, setIsControlledSurfaceTimeOrInterval] = React.useState<boolean>(false);
    const [isControlledRealizationNum, setIsControlledRealizationNum] = React.useState<boolean>(false);
    const [isControlledStage, setIsControlledStage] = React.useState<boolean>(false);

    const addSurfaceSelect = () => {
        setSurfaceAddresses([...surfaceAddresses, null]);
    };
    const removeSurfaceSelect = (index: number) => {
        setSurfaceAddresses(surfaceAddresses.filter((_, i) => i !== index));
    };
    const handleSurfaceSelectChange = (index: number, data: SurfaceAddress) => {
        setSurfaceAddresses((prevAddresses) => {
            const newData = [...prevAddresses];
            newData[index] = data;
            return newData;
        });
    };
    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeType(event.target.value as TimeType);
    }

    function handleSurfaceAttributeTypeChange(vals: string[]) {
        setSurfaceAttributeTypes(vals as SurfaceAttributeType_api[]);
    }
    React.useEffect(
        function propogateSurfaceAddressesToView() {
            moduleContext
                .getStateStore()
                .setValue(
                    "surfaceAddresses",
                    surfaceAddresses.filter((address): address is SurfaceAddress => address != null) ?? []
                );
        },
        [surfaceAddresses, moduleContext]
    ); // Moved the dependency array here

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
            <div className="m-2">
                <LabelledSwitch
                    label={"Sync surface name"}
                    checked={isControlledSurfaceName}
                    onToggle={setIsControlledSurfaceName}
                />
                <LabelledSwitch
                    label={"Sync surface attribute"}
                    checked={isControlledSurfaceAttribute}
                    onToggle={setIsControlledSurfaceAttribute}
                />
                <LabelledSwitch
                    label={"Sync surface time/interval"}
                    checked={isControlledSurfaceTimeOrInterval}
                    onToggle={setIsControlledSurfaceTimeOrInterval}
                />
                <LabelledSwitch
                    label={"Sync realization number"}
                    checked={isControlledRealizationNum}
                    onToggle={setIsControlledRealizationNum}
                />
            </div>
            <div className="m-2">
                <Button variant={"contained"} onClick={addSurfaceSelect}>
                    Add Surface
                </Button>
            </div>
            {surfaceAddresses.map((data, index) => (
                <div key={`surface-select-${index}`} style={{ position: "relative" }}>
                    <button
                        onClick={() => removeSurfaceSelect(index)}
                        style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            zIndex: 2,
                        }}
                    >
                        &#10006;
                    </button>
                    <div style={{ width: "90%" }} className="mb-2">
                        <CollapsibleGroup expanded={false} title={`Surface ${index + 1}`}>
                            <EnsembleSurfaceSelect
                                ensembleSetSurfaceMetas={ensembleSetSurfaceMetas}
                                surfaceAttributeTypes={surfaceAttributeTypes}
                                timeType={timeType}
                                workbenchSession={workbenchSession}
                                controlledSurfaceName={
                                    index > 0 && isControlledSurfaceName ? surfaceAddresses[0]?.name : undefined
                                }
                                controlledSurfaceAttribute={
                                    index > 0 && isControlledSurfaceAttribute
                                        ? surfaceAddresses[0]?.attribute
                                        : undefined
                                }
                                controlledSurfaceTimeOrInterval={
                                    index > 0 && isControlledSurfaceTimeOrInterval
                                        ? surfaceAddresses[0]?.isoDateOrInterval
                                        : undefined
                                }
                                controlledRealizationNum={
                                    index > 0 && isControlledRealizationNum
                                        ? surfaceAddresses[0]?.addressType === "realization"
                                            ? surfaceAddresses[0]?.realizationNum
                                            : undefined
                                        : undefined
                                }
                                onAddressChange={(data: SurfaceAddress) => handleSurfaceSelectChange(index, data)}
                            />
                        </CollapsibleGroup>
                    </div>
                </div>
            ))}
        </div>
    );
}

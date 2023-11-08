import React, { useState } from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import { SurfaceAddress } from "@modules/_shared/Surface";
import { TimeType } from "@modules/_shared/Surface";

import { v4 as uuidv4 } from "uuid";

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
type UniqueSurfaceAddress = {
    id: string;
    data: SurfaceAddress | null;
};

export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(
        ensembleSet.getEnsembleArr().map((ens) => ens.getIdent())
    );
    const [surfaceAddresses, setSurfaceAddresses] = useState<Array<UniqueSurfaceAddress>>([]);

    const [timeType, setTimeType] = React.useState<TimeType>(TimeType.None);
    const [surfaceAttributeTypes, setSurfaceAttributeTypes] = React.useState<SurfaceAttributeType_api[]>(
        Object.values(SurfaceAttributeType_api)
    );
    const [isControlledEnsemble, setIsControlledEnsemble] = React.useState<boolean>(false);
    const [isControlledSurfaceName, setIsControlledSurfaceName] = React.useState<boolean>(false);
    const [isControlledSurfaceAttribute, setIsControlledSurfaceAttribute] = React.useState<boolean>(false);
    const [isControlledSurfaceTimeOrInterval, setIsControlledSurfaceTimeOrInterval] = React.useState<boolean>(false);
    const [isControlledRealizationNum, setIsControlledRealizationNum] = React.useState<boolean>(false);
    const [isControlledStage, setIsControlledStage] = React.useState<boolean>(false);

    const addSurfaceSelect = () => {
        const newSurface: UniqueSurfaceAddress = {
            id: uuidv4(), // generates a unique ID
            data: null,
        };

        setSurfaceAddresses([...surfaceAddresses, newSurface]);
    };
    const removeSurfaceSelect = (uniqueId: string) => {
        setSurfaceAddresses(surfaceAddresses.filter((surface) => surface.id !== uniqueId));
    };
    const handleSurfaceSelectChange = (uniqueId: string, newData: SurfaceAddress) => {
        setSurfaceAddresses((prevAddresses) =>
            prevAddresses.map((surface) => (surface.id === uniqueId ? { ...surface, data: newData } : surface))
        );
    };

    function handleTimeModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTimeType(event.target.value as TimeType);
    }

    function handleSurfaceAttributeTypeChange(vals: string[]) {
        setSurfaceAttributeTypes(vals as SurfaceAttributeType_api[]);
    }
    React.useEffect(() => {
        function propagateSurfaceAddressesToView() {
            // Extract SurfaceAddress data from the new structure before setting the value.
            const surfaceAddressesData = surfaceAddresses
                .map((uniqueSurface) => uniqueSurface.data)
                .filter((address): address is SurfaceAddress => address !== null);
            console.log("surfaceAddressesData", surfaceAddressesData);
            moduleContext.getStateStore().setValue("surfaceAddresses", surfaceAddressesData);
        }

        propagateSurfaceAddressesToView();
    }, [surfaceAddresses, moduleContext]);

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
            <CollapsibleGroup expanded={true} title="Synchronization">
                <table className="table-auto w-full divide-y divide-gray-200">
                    <tr className="bg-slate-100">
                        <td className="px-6 py-0 whitespace-nowrap">{`Ensemble`}</td>
                        <td className="px-6 py-0 w-full whitespace-nowrap">
                            <Switch
                                checked={isControlledEnsemble}
                                onChange={(e) => setIsControlledEnsemble(e.target.checked)}
                            />
                        </td>
                    </tr>
                    <tr className="bg-slate-100">
                        <td className="px-6 py-0 whitespace-nowrap">{`Name`}</td>
                        <td className="px-6 py-0 w-full whitespace-nowrap">
                            <Switch
                                checked={isControlledSurfaceName}
                                onChange={(e) => setIsControlledSurfaceName(e.target.checked)}
                            />
                        </td>
                    </tr>
                    <tr className="bg-slate-100">
                        <td className="px-6 py-0 whitespace-nowrap">{`Attribute`}</td>
                        <td className="px-6 py-0 w-full whitespace-nowrap">
                            <Switch
                                checked={isControlledSurfaceAttribute}
                                onChange={(e) => setIsControlledSurfaceAttribute(e.target.checked)}
                            />
                        </td>
                    </tr>
                    <tr className="bg-slate-100">
                        <td className="px-6 py-0 whitespace-nowrap">{`Time/interval`}</td>
                        <td className="px-6 py-0 w-full whitespace-nowrap">
                            <Switch
                                checked={isControlledSurfaceTimeOrInterval}
                                onChange={(e) => setIsControlledSurfaceTimeOrInterval(e.target.checked)}
                            />
                        </td>
                    </tr>
                    <tr className="bg-slate-100">
                        <td className="px-6 py-0 whitespace-nowrap">{`Real`}</td>
                        <td className="px-6 py-0 w-full whitespace-nowrap">
                            <Switch
                                checked={isControlledRealizationNum}
                                onChange={(e) => setIsControlledRealizationNum(e.target.checked)}
                            />
                        </td>
                    </tr>
                </table>
            </CollapsibleGroup>
            <div className="m-2">
                <Button variant={"contained"} onClick={addSurfaceSelect}>
                    Add Surface
                </Button>
            </div>
            <table className="table-auto w-full divide-y divide-gray-200">
                <tbody>
                    {surfaceAddresses.map((uniqueSurface, index) => (
                        <EnsembleSurfaceSelect
                            index={index}
                            key={"surface-select--" + uniqueSurface.id}
                            id={uniqueSurface.id}
                            ensembleSetSurfaceMetas={ensembleSetSurfaceMetas}
                            surfaceAttributeTypes={surfaceAttributeTypes}
                            timeType={timeType}
                            workbenchSession={workbenchSession}
                            onRemove={removeSurfaceSelect}
                            controlledEnsembleIdent={
                                index > 0 && isControlledEnsemble
                                    ? EnsembleIdent.fromCaseUuidAndEnsembleName(
                                          surfaceAddresses[0]?.data?.caseUuid || "",
                                          surfaceAddresses[0]?.data?.ensemble || ""
                                      )
                                    : undefined
                            }
                            controlledSurfaceName={
                                index > 0 && isControlledSurfaceName ? surfaceAddresses[0]?.data?.name : undefined
                            }
                            controlledSurfaceAttribute={
                                index > 0 && isControlledSurfaceAttribute
                                    ? surfaceAddresses[0]?.data?.attribute
                                    : undefined
                            }
                            controlledSurfaceTimeOrInterval={
                                index > 0 && isControlledSurfaceTimeOrInterval
                                    ? surfaceAddresses[0]?.data?.isoDateOrInterval
                                    : undefined
                            }
                            controlledRealizationNum={
                                index > 0 && isControlledRealizationNum
                                    ? surfaceAddresses[0]?.data?.addressType === "realization"
                                        ? surfaceAddresses[0]?.data?.realizationNum
                                        : undefined
                                    : undefined
                            }
                            onAddressChange={(data: SurfaceAddress) =>
                                handleSurfaceSelectChange(uniqueSurface.id, data)
                            }
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { Dropdown } from "@lib/components/Dropdown";

import { PrevNextButtonsProps } from "./previousNextButtons";

export enum EnsembleStageType {
    Statistics = "Statistics",
    Realization = "Realization",
    // Observation = "Observation",
}

export type EnsembleStatisticStage = {
    ensembleStage: EnsembleStageType.Statistics;
    statisticFunction: SurfaceStatisticFunction_api;
    realizationNums: number[];
};

export type EnsembleRealizationStage = {
    ensembleStage: EnsembleStageType.Realization;
    realizationNum: number;
};

// export type EnsembleObservationStage = {
//     ensembleStage: EnsembleStageType.Observation;
//     realizationNum?: number; // The observation might be tied to a realization (e.g., depth converted)
// };

export type EnsembleStage = EnsembleStatisticStage | EnsembleRealizationStage; //| EnsembleObservationStage;

export type AggregationSelectProps = {
    stage: EnsembleStageType;
    availableRealizationNums: number[];
    realizationNum: number;
    statisticFunction: SurfaceStatisticFunction_api;
    onChange(stage: EnsembleStage): void;
};
const StatisticFunctionToStringMapping = {
    [SurfaceStatisticFunction_api.MEAN]: "Mean",
    [SurfaceStatisticFunction_api.MIN]: "Min",
    [SurfaceStatisticFunction_api.MAX]: "Max",
    [SurfaceStatisticFunction_api.STD]: "StdDev",
    [SurfaceStatisticFunction_api.P10]: "P10",
    [SurfaceStatisticFunction_api.P50]: "P50",
    [SurfaceStatisticFunction_api.P90]: "P90",
};

export const AggregationSelect: React.FC<AggregationSelectProps> = (props) => {
    function handleRealizationNumChange(realNum: string) {
        props.onChange({
            ensembleStage: EnsembleStageType.Realization,
            realizationNum: parseInt(realNum),
        });
    }
    function handleStageChange(stage: string) {
        if (stage == EnsembleStageType.Statistics) {
            props.onChange({
                ensembleStage: EnsembleStageType.Statistics,
                statisticFunction: SurfaceStatisticFunction_api.MEAN,
                realizationNums: [],
            });
        }
        // if (stage == EnsembleStageType.Observation) {
        //     props.onChange({
        //         ensembleStage: EnsembleStageType.Observation,
        //     });
        // }
        if (stage == EnsembleStageType.Realization) {
            props.onChange({
                ensembleStage: EnsembleStageType.Realization,
                realizationNum: props.realizationNum ? props.realizationNum : props.availableRealizationNums[0],
            });
        }
    }
    const realizationOptions = props.availableRealizationNums.map((num) => ({
        label: num.toString(),
        value: num.toString(),
    }));
    const stageOptions = Object.keys(EnsembleStageType).map((stage) => ({ label: stage, value: stage }));
    const statisticOptions = Object.values(SurfaceStatisticFunction_api).map((val: SurfaceStatisticFunction_api) => {
        return { value: val, label: StatisticFunctionToStringMapping[val] };
    });
    return (
        <>
            <tr>
                <td className="px-6 py-0 whitespace-nowrap">Stage</td>
                <td className="px-6 py-0 w-full whitespace-nowrap flex">
                    <Dropdown options={stageOptions} value={props.stage} onChange={handleStageChange} />
                    {props.stage == EnsembleStageType.Realization && (
                        <Dropdown
                            options={realizationOptions}
                            value={props.realizationNum.toString()}
                            onChange={handleRealizationNumChange}
                        />
                    )}
                    {props.stage == EnsembleStageType.Statistics && (
                        <Dropdown
                            options={statisticOptions}
                            value={props.statisticFunction}
                            onChange={(stat) =>
                                props.onChange({
                                    ensembleStage: EnsembleStageType.Statistics,
                                    statisticFunction: stat as SurfaceStatisticFunction_api,
                                    realizationNums: [],
                                })
                            }
                        />
                    )}
                </td>

                <td className="px-0 py-0 whitespace-nowrap text-right">
                    {props.stage == EnsembleStageType.Realization && (
                        <PrevNextButtonsProps
                            onChange={handleRealizationNumChange}
                            options={realizationOptions.map((option) => option.value.toString())}
                            value={props.realizationNum.toString()}
                        />
                    )}
                </td>
            </tr>
        </>
    );
};

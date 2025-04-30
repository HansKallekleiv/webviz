import { FlowVector_api, WellFlowData_api, WellboreCompletionSmda_api, WellboreSurvey_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import { CompletionType, FlowType, WellTrajectoryData } from "../DrilledWellTrajectoriesProvider";

export class WellSurveyCollection {
    private data: WellTrajectoryData[] = [];
    private referenceSystems: IntersectionReferenceSystem[] = [];
    constructor(trajectoryData: WellboreSurvey_api[]) {
        this.data = trajectoryData.map((trajectory) => {
            return {
                wellboreUuid: trajectory.wellboreUuid,
                uniqueWellboreIdentifier: trajectory.uniqueWellboreIdentifier,
                tvdMslArr: trajectory.surveyPoints.map((point) => point.tvdMsl),
                mdArr: trajectory.surveyPoints.map((point) => point.md),
                eastingArr: trajectory.surveyPoints.map((point) => point.easting),
                northingArr: trajectory.surveyPoints.map((point) => point.northing),
                completionArr: Array(trajectory.surveyPoints.map((point) => point.md).length).fill(CompletionType.NONE),
                flowType: null,
            };
        });
        this.referenceSystems = trajectoryData.map((trajectory) => {
            const path: number[][] = trajectory.surveyPoints.map((point) => {
                return [point.easting, point.northing, point.tvdMsl];
            });
            const offset = trajectory.surveyPoints[0].md;
            const referenceSystem = new IntersectionReferenceSystem(path);
            referenceSystem.offset = offset;
            console.log("position", referenceSystem.getPosition(1000));
            console.log("project", referenceSystem.project(1000));
            return referenceSystem;
        });
    }
    private mapFlowData(flowDataArr: WellFlowData_api[], flowVectors: FlowVector_api[]) {
        return flowDataArr.reduce(
            (map, flowData) => {
                let flowType: FlowType | null = null;
                if (
                    flowVectors.includes(FlowVector_api.OIL_PRODUCTION) &&
                    flowData.oil_production_volume &&
                    flowData.oil_production_volume > 4327921
                ) {
                    flowType = FlowType.OIL_PROD;
                } else if (
                    flowVectors.includes(FlowVector_api.GAS_PRODUCTION) &&
                    flowData.gas_production_volume &&
                    flowData.gas_production_volume > 0
                ) {
                    flowType = FlowType.GAS_PROD;
                } else if (
                    flowVectors.includes(FlowVector_api.WATER_PRODUCTION) &&
                    flowData.water_production_volume &&
                    flowData.water_production_volume > 0
                ) {
                    flowType = FlowType.WATER_PROD;
                }
                if (flowType) {
                    map[flowData.well_uwi ?? ""] = flowType;
                }
                return map;
            },
            {} as { [key: string]: FlowType },
        );
    }
    filterOnFlowTypes(flowDataArr: WellFlowData_api[], flowTypes: FlowVector_api[]) {
        const flowDataMap = this.mapFlowData(flowDataArr, flowTypes);
        this.data = this.data
            .map((wellData) => {
                const flowType = flowDataMap[wellData.uniqueWellboreIdentifier];
                if (flowType) {
                    wellData.flowType = flowType;
                    return wellData;
                }
                return null;
            })
            .filter((wellData) => wellData !== null);
    }
    private isCompletionInDateInterval(
        completionData: WellboreCompletionSmda_api,
        startDate: string | null,
        endDate: string | null,
    ): boolean {
        let startIsValid = true;
        let endIsValid = true;
        if (startDate && completionData.dateOpened) {
            const startDateMs = new Date(startDate).getTime();
            const completionStartDate = new Date(completionData.dateOpened).getTime();
            startIsValid = startDateMs <= completionStartDate;
        }
        if (endDate && completionData.dateClosed) {
            const endDateMs = new Date(endDate).getTime();
            const completionEndDate = new Date(completionData.dateClosed ?? "").getTime();
            endIsValid = endDateMs >= completionEndDate;
        }
        return startIsValid && endIsValid;
    }
    filterOnCompletions(
        completionDataArr: WellboreCompletionSmda_api[],
        completionTypes: CompletionType[],
        startDate: string | null,
        endDate: string | null,
    ) {
        this.data = this.data
            .map((wellData) => {
                const completionData = completionDataArr.find((completion) => {
                    return completion.wellboreUuid === wellData.wellboreUuid;
                });
                if (completionData && this.isCompletionInDateInterval(completionData, startDate, endDate)) {
                    const completionType = completionData.completionType as CompletionType;
                    if (completionTypes?.includes(completionType)) {
                        const startMd = completionData.topDepthMd;
                        const endMd = completionData.baseDepthMd;
                        for (let i = 0; i < wellData.mdArr.length; i++) {
                            if (wellData.mdArr[i] >= startMd && wellData.mdArr[i] <= endMd) {
                                wellData.completionArr[i] = completionType;
                            }
                        }
                    }
                }
                return wellData;
            })
            .filter((wellData) => wellData !== null);
    }

    getData() {
        return this.data;
    }
}

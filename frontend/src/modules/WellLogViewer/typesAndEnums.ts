import { WellboreLogCurveData_api } from "@api";

export type LogCurveResult = {
    logCurveName: string;
    data: WellboreLogCurveData_api | null;
};
export type CombinedLogCurvesResult = {
    curvesData: LogCurveResult[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};

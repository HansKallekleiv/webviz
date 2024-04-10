import { WellboreLogCurveData_api } from "@api";

export type LogCurveResult = {
    logCurveName: string;
    data: WellboreLogCurveData_api[];
};
export type CombinedLogCurvesResult = {
    curvesData: LogCurveResult[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};

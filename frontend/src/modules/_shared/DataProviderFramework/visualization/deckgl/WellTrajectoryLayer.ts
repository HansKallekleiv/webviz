import { WellTrajectoryData } from "../../dataProviders/implementations/DrilledWellTrajectoriesProvider";

class WellTrajectoryDeckGLData {
    private wellTrajectoryData: WellTrajectoryData;
    private lineWidth: number = 20;
    private wellHeadSize: number = 1;

    constructor(wellTrajectoryData: WellTrajectoryData) {
        this.wellTrajectoryData = wellTrajectoryData;
    }
    //   private createWellHeadFeature
}

// function wellTrajectoryToGeojson(wellTrajectory: WellTrajectoryData): Feature[] {
//     const point: Point = {
//         type: "Point",
//         coordinates: [wellTrajectory.eastingArr[0], wellTrajectory.northingArr[0], -wellTrajectory.tvdMslArr[0]],
//     };
//     const pointFeature: Feature<Point, GeoJsonProperties> = {
//         type: "Feature",
//         geometry: point,
//         properties: {
//             uuid: wellTrajectory.wellboreUuid,
//             name: wellTrajectory.uniqueWellboreIdentifier,
//             uwi: wellTrajectory.uniqueWellboreIdentifier,
//             color: colorOnFlowType(wellTrajectory.flowType),
//             md: [wellTrajectory.mdArr[0]],
//             lineWidth: 20,
//             wellHeadSize: 1,
//         },
//     };

//     const lineFeatureArr: Feature<LineString, GeoJsonProperties>[] = [];

//     let startIndex = 0;
//     let currentCompletionType = wellTrajectory.completionArr[0];

//     for (let i = 1; i < wellTrajectory.completionArr.length; i++) {
//         const nextCompletion = wellTrajectory.completionArr[i];

//         if (nextCompletion !== currentCompletionType) {
//             // Close the current segment here (up to i)
//             const coordinates: LineString = {
//                 type: "LineString",
//                 coordinates: zipCoords(
//                     wellTrajectory.eastingArr.slice(startIndex, i + 1),
//                     wellTrajectory.northingArr.slice(startIndex, i + 1),
//                     wellTrajectory.tvdMslArr.slice(startIndex, i + 1),
//                 ),
//             };

//             const lineFeature: Feature<LineString, GeoJsonProperties> = {
//                 type: "Feature",
//                 geometry: coordinates,
//                 properties: {
//                     uuid: wellTrajectory.wellboreUuid,
//                     name: wellTrajectory.uniqueWellboreIdentifier,
//                     uwi: wellTrajectory.uniqueWellboreIdentifier,
//                     color: colorOnFlowType(wellTrajectory.flowType),
//                     completion: currentCompletionType,
//                     md: [wellTrajectory.mdArr[startIndex]],
//                     lineWidth: currentCompletionType === CompletionType.NONE ? 4 : 1,
//                     wellHeadSize: 1,
//                 },
//             };

//             lineFeatureArr.push(lineFeature);

//             // Start new segment
//             startIndex = i;
//             currentCompletionType = nextCompletion;
//         }
//     }

//     // Catch the final segment after the loop ends
//     if (startIndex < wellTrajectory.eastingArr.length - 1) {
//         const coordinates: LineString = {
//             type: "LineString",
//             coordinates: zipCoords(
//                 wellTrajectory.eastingArr.slice(startIndex),
//                 wellTrajectory.northingArr.slice(startIndex),
//                 wellTrajectory.tvdMslArr.slice(startIndex),
//             ),
//         };

//         const lineFeature: Feature<LineString, GeoJsonProperties> = {
//             type: "Feature",
//             geometry: coordinates,
//             properties: {
//                 uuid: wellTrajectory.wellboreUuid,
//                 name: wellTrajectory.uniqueWellboreIdentifier,
//                 uwi: wellTrajectory.uniqueWellboreIdentifier,
//                 color: colorOnFlowType(wellTrajectory.flowType),
//                 completion: currentCompletionType,
//                 md: [wellTrajectory.mdArr[startIndex]],
//                 lineWidth: currentCompletionType === CompletionType.NONE ? 4 : 1,
//                 wellHeadSize: 1,
//             },
//         };

//         lineFeatureArr.push(lineFeature);
//     }

//     return [pointFeature, ...lineFeatureArr];
// }

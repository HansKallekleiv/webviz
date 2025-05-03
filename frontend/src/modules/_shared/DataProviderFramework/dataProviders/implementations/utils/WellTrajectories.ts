import { FlowVector_api, WellFlowData_api, WellboreCompletionSmda_api, WellboreSurvey_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import { CompletionType, FlowType, WellTrajectoryData } from "../DrilledWellTrajectoriesProvider";

export type WellTrajectorySegment = {
    wellboreUuid: string;
    uniqueWellboreIdentifier: string;
    segmentId: string;
    segmentIndex: number;
    eastingArr: number[];
    northingArr: number[];
    tvdMslArr: number[];
    mdArr: number[];
    completionType: CompletionType;
    flowType: FlowType | null;
};

export function createReferenceSystem(wellData: WellTrajectoryData): IntersectionReferenceSystem | null {
    // Need at least 2 points to define a path
    if (!wellData.eastingArr || wellData.eastingArr.length < 2) {
        return null;
    }
    try {
        // Create path array [[easting, northing, tvdMsl], ...]
        const path: number[][] = [];
        for (let i = 0; i < wellData.eastingArr.length; i++) {
            // Basic check for valid coordinate numbers
            if (
                !Number.isFinite(wellData.eastingArr[i]) ||
                !Number.isFinite(wellData.northingArr[i]) ||
                !Number.isFinite(wellData.tvdMslArr[i])
            ) {
                console.warn(
                    `Invalid coordinate data found for ${wellData.uniqueWellboreIdentifier} at index ${i}. Skipping reference system creation.`,
                );
                return null;
            }
            path.push([wellData.eastingArr[i], wellData.northingArr[i], wellData.tvdMslArr[i]]);
        }

        // Get MD offset from the first point
        const offset = wellData.mdArr[0];
        if (!Number.isFinite(offset)) {
            console.warn(
                `Invalid starting MD found for ${wellData.uniqueWellboreIdentifier}. Skipping reference system creation.`,
            );
            return null;
        }

        // Create and configure the reference system
        const referenceSystem = new IntersectionReferenceSystem(path);
        referenceSystem.offset = offset;
        return referenceSystem;
    } catch (error) {
        console.error(
            `Failed to create IntersectionReferenceSystem for ${wellData.uniqueWellboreIdentifier}: ${error}`,
        );
        return null;
    }
}
function determineFlowType(flowData: WellFlowData_api, flowVectors: ReadonlySet<FlowVector_api>): FlowType | null {
    const MIN_OIL_PROD_THRESHOLD = 1000; //TODO
    const MIN_GAS_PROD_THRESHOLD = 1000; //TODO
    const MIN_WATER_PROD_THRESHOLD = 1000; //TODO

    if (
        flowVectors.has(FlowVector_api.OIL_PRODUCTION) &&
        flowData.oil_production_volume != null &&
        flowData.oil_production_volume >= MIN_OIL_PROD_THRESHOLD
    ) {
        return FlowType.OIL_PROD;
    }
    if (
        flowVectors.has(FlowVector_api.GAS_PRODUCTION) &&
        flowData.gas_production_volume != null &&
        flowData.gas_production_volume >= MIN_GAS_PROD_THRESHOLD
    ) {
        return FlowType.GAS_PROD;
    }
    if (
        flowVectors.has(FlowVector_api.WATER_PRODUCTION) &&
        flowData.water_production_volume != null &&
        flowData.water_production_volume >= MIN_WATER_PROD_THRESHOLD
    ) {
        return FlowType.WATER_PROD;
    }
    if (
        flowVectors.has(FlowVector_api.WATER_INJECTION) &&
        flowData.water_injection_volume != null &&
        flowData.water_injection_volume > 0
    ) {
        return FlowType.WATER_INJ;
    }
    if (
        flowVectors.has(FlowVector_api.GAS_INJECTION) &&
        flowData.gas_injection_volume != null &&
        flowData.gas_injection_volume > 0
    ) {
        return FlowType.GAS_INJ;
    }
    return null;
}

function isCompletionOverlappingDateInterval(
    completionData: WellboreCompletionSmda_api,
    filterStartMs: number | null,
    filterEndMs: number | null,
): boolean {
    if (!completionData.dateOpened) return false;
    const completionStartMs = new Date(completionData.dateOpened).getTime();
    const completionEndMs = completionData.dateClosed ? new Date(completionData.dateClosed).getTime() : Infinity;
    const effectiveFilterStart = filterStartMs ?? -Infinity;
    const effectiveFilterEnd = filterEndMs ?? Infinity;
    return completionStartMs < effectiveFilterEnd && completionEndMs > effectiveFilterStart;
}
/**
 * Interpolates position [easting, northing, tvd] at a given measured depth.
 * Returns null if interpolation fails.
 */
function interpolatePosition(refSystem: IntersectionReferenceSystem, md: number): [number, number, number] | null {
    try {
        const [x, y] = refSystem.getPosition(md);
        const [, z] = refSystem.project(md);
        const pos: [number, number, number] = [x, y, -z];
        // Check if all coordinates are finite numbers
        // (e.g., not NaN, Infinity, etc.)
        if (pos && pos.every(Number.isFinite)) {
            return pos;
        }
        console.warn(`Interpolated position at MD ${md} resulted in invalid coordinates.`);
        return null;
    } catch (error) {
        console.warn(`Failed to interpolate position at MD ${md}: ${error}`);
        return null;
    }
}
/**
 * Collects unique MD breakpoints from survey start/end and relevant completions.
 * Returns an array of sorted breakpoints.
 */
function collectAndSortBreakpoints(
    wellData: WellTrajectoryData,
    relevantCompletions: WellboreCompletionSmda_api[],
    // *** New Param ***
    stratIntervals: Array<{ entryMd: number; exitMd: number }> | undefined,
): number[] {
    // Ensure mdArr is not empty before accessing indices
    if (!wellData.mdArr || wellData.mdArr.length === 0) {
        return [];
    }
    const surveyStartMd = wellData.mdArr[0];
    const surveyEndMd = wellData.mdArr[wellData.mdArr.length - 1];
    const breakpoints = new Set<number>();
    breakpoints.add(surveyStartMd);
    breakpoints.add(surveyEndMd);

    // Add completion breakpoints
    for (const comp of relevantCompletions) {
        if (comp.topDepthMd != null && comp.topDepthMd > surveyStartMd && comp.topDepthMd < surveyEndMd)
            breakpoints.add(comp.topDepthMd);
        if (comp.baseDepthMd != null && comp.baseDepthMd > surveyStartMd && comp.baseDepthMd < surveyEndMd)
            breakpoints.add(comp.baseDepthMd);
    }

    // *** Add stratigraphic breakpoints ***
    if (stratIntervals) {
        for (const interval of stratIntervals) {
            if (interval.entryMd != null && interval.entryMd > surveyStartMd && interval.entryMd < surveyEndMd)
                breakpoints.add(interval.entryMd);
            if (interval.exitMd != null && interval.exitMd > surveyStartMd && interval.exitMd < surveyEndMd)
                breakpoints.add(interval.exitMd);
        }
    }

    return Array.from(breakpoints).sort((a, b) => a - b);
}

/**
 * Determines the dominant completion type for a given MD interval midpoint.
 * Implements an overlap rule (e.g., deepest completion wins).
 */
function determineIntervalCompletionType(
    intervalMidMd: number,
    relevantCompletions: WellboreCompletionSmda_api[],
): CompletionType {
    let intervalCompletionType = CompletionType.NONE;
    let winningCompletionBaseMd = -1; // For overlap rule: deepest wins

    for (const comp of relevantCompletions) {
        // Check if midpoint falls within this completion's range
        if (intervalMidMd >= comp.topDepthMd! && intervalMidMd < comp.baseDepthMd!) {
            // --- Apply Overlap Rule ---
            if (comp.baseDepthMd! > winningCompletionBaseMd) {
                winningCompletionBaseMd = comp.baseDepthMd!;
                intervalCompletionType = comp.completionType as CompletionType;
            }
            // --- (Implement alternative overlap rules if needed) ---
        }
    }
    return intervalCompletionType;
}
/**
 * Generates the coordinate arrays for a single segment between two MD values,
 * including interpolated endpoints and intermediate survey points.
 * Returns null if interpolation fails or segment would have < 2 points.
 */
function generateSegmentCoordinates(
    intervalStartMd: number,
    intervalEndMd: number,
    wellData: WellTrajectoryData,
    refSystem: IntersectionReferenceSystem,
): { mdArr: number[]; eastingArr: number[]; northingArr: number[]; tvdMslArr: number[] } | null {
    const segmentMd: number[] = [];
    const segmentEasting: number[] = [];
    const segmentNorthing: number[] = [];
    const segmentTvd: number[] = [];

    // Interpolate start point
    const startPos = interpolatePosition(refSystem, intervalStartMd);
    if (!startPos) return null; // Cannot create segment without start point
    segmentMd.push(intervalStartMd);
    segmentEasting.push(startPos[0]);
    segmentNorthing.push(startPos[1]);
    segmentTvd.push(startPos[2]);

    // Add relevant original survey points within the interval
    for (let j = 0; j < wellData.mdArr.length; j++) {
        if (wellData.mdArr[j] > intervalStartMd && wellData.mdArr[j] < intervalEndMd) {
            segmentMd.push(wellData.mdArr[j]);
            segmentEasting.push(wellData.eastingArr[j]);
            segmentNorthing.push(wellData.northingArr[j]);
            segmentTvd.push(wellData.tvdMslArr[j]);
        }
    }

    // Interpolate end point
    const endPos = interpolatePosition(refSystem, intervalEndMd);
    if (!endPos) return null; // Cannot create segment without end point

    // Add end point only if MD is different from the last point added
    if (segmentMd.length === 0 || segmentMd[segmentMd.length - 1] < intervalEndMd) {
        segmentMd.push(intervalEndMd);
        segmentEasting.push(endPos[0]);
        segmentNorthing.push(endPos[1]);
        segmentTvd.push(endPos[2]);
    }

    // Check if the segment has at least 2 points
    if (segmentMd.length < 2) {
        return null;
    }

    return { mdArr: segmentMd, eastingArr: segmentEasting, northingArr: segmentNorthing, tvdMslArr: segmentTvd };
}
/**
 * Filters completions relevant to a specific well based on type, date, and survey range.
 */
function filterAndValidateCompletionsForWell(
    wellCompletions: WellboreCompletionSmda_api[] | undefined,
    requestedCompletionTypes: Set<CompletionType>,
    filterStartMs: number | null,
    filterEndMs: number | null,
    surveyStartMd: number,
    surveyEndMd: number,
): WellboreCompletionSmda_api[] {
    if (!wellCompletions) {
        return [];
    }
    return wellCompletions.filter(
        (comp) =>
            comp.topDepthMd != null && // Basic validity checks
            comp.baseDepthMd != null &&
            comp.topDepthMd <= comp.baseDepthMd &&
            requestedCompletionTypes.has(comp.completionType as CompletionType) && // Check type
            isCompletionOverlappingDateInterval(comp, filterStartMs, filterEndMs) && // Check date
            // Check if completion overlaps with survey MD range
            comp.baseDepthMd > surveyStartMd &&
            comp.topDepthMd < surveyEndMd,
    );
}

/**
 * Orchestrates the segmentation of a single well's trajectory using interpolation.
 */
function processSingleWellForSegments_Interpolated(
    wellData: WellTrajectoryData,
    refSystem: IntersectionReferenceSystem,
    allWellCompletions: WellboreCompletionSmda_api[] | undefined,
    // *** New Param ***
    stratIntervals: Array<{ entryMd: number; exitMd: number }> | undefined,
    requestedCompletionTypes: Set<CompletionType>,
    filterStartMs: number | null,
    filterEndMs: number | null,
): WellTrajectorySegment[] {
    const segmentsForThisWell: WellTrajectorySegment[] = [];
    const numSurveyPoints = wellData.mdArr?.length ?? 0; // Handle potentially empty arrays

    if (numSurveyPoints < 2) return segmentsForThisWell; // Cannot process if < 2 survey points

    const surveyStartMd = wellData.mdArr[0];
    const surveyEndMd = wellData.mdArr[numSurveyPoints - 1];

    // 1. Filter relevant completions
    const relevantCompletions = filterAndValidateCompletionsForWell(
        allWellCompletions,
        requestedCompletionTypes,
        filterStartMs,
        filterEndMs,
        surveyStartMd,
        surveyEndMd,
    );

    // 2. Determine breakpoints (now includes strat boundaries)
    const sortedBreakpoints = collectAndSortBreakpoints(wellData, relevantCompletions, stratIntervals); // Pass stratIntervals

    // 3. Process intervals between breakpoints
    let segmentCounter = 0; // Counter for segments *created* for this well
    for (let i = 0; i < sortedBreakpoints.length - 1; i++) {
        const intervalStartMd = sortedBreakpoints[i];
        const intervalEndMd = sortedBreakpoints[i + 1];
        if (intervalStartMd >= intervalEndMd) continue; // Skip zero-length

        const intervalMidMd = (intervalStartMd + intervalEndMd) / 2;

        // *** Check if interval is within the target stratigraphic unit ***
        let isWithinStratUnit = false;
        // Only apply strat filtering IF intervals were provided for this well
        if (stratIntervals && stratIntervals.length > 0) {
            for (const interval of stratIntervals) {
                // Check if midpoint is within any allowed interval [entryMd, exitMd)
                if (intervalMidMd >= interval.entryMd && intervalMidMd < interval.exitMd) {
                    isWithinStratUnit = true;
                    break;
                }
            }
        } else {
            // If NO strat intervals apply to this well (either none exist, or fetch was disabled/empty),
            // then we DON'T filter based on stratigraphy - treat as within.
            isWithinStratUnit = true;
        }

        // *** If interval is NOT within the required strat unit, skip creating a segment ***
        if (!isWithinStratUnit) {
            continue;
        }

        // --- Proceed only if within strat unit ---

        // 4. Determine completion type for the interval
        const intervalCompletionType = determineIntervalCompletionType(intervalMidMd, relevantCompletions);

        // 5. Generate coordinates for this segment
        const segmentCoords = generateSegmentCoordinates(intervalStartMd, intervalEndMd, wellData, refSystem);

        // 6. If coordinates are valid, create the segment object
        if (segmentCoords) {
            const segment: WellTrajectorySegment = {
                wellboreUuid: wellData.wellboreUuid,
                uniqueWellboreIdentifier: wellData.uniqueWellboreIdentifier,
                // Use segmentCounter for IDs/Indices of *created* segments
                segmentId: `${wellData.wellboreUuid}-seg${segmentCounter}`,
                segmentIndex: segmentCounter,
                eastingArr: segmentCoords.eastingArr,
                northingArr: segmentCoords.northingArr,
                tvdMslArr: segmentCoords.tvdMslArr,
                mdArr: segmentCoords.mdArr,
                completionType: intervalCompletionType,
                flowType: wellData.flowType,
            };
            segmentsForThisWell.push(segment);
            segmentCounter++; // Increment only when a segment is actually created
        }
    } // End loop through intervals

    return segmentsForThisWell;
}
// --- Public Transformation Functions ---

/**
 * Transforms raw survey data into the intermediate WellTrajectoryData structure.
 */
export function transformSurveyData(surveyData: WellboreSurvey_api[]): WellTrajectoryData[] {
    // (Keep same logic as previous version)
    return surveyData.map((trajectory) => {
        // ... see previous implementation ...
        return {
            wellboreUuid: trajectory.wellboreUuid,
            uniqueWellboreIdentifier: trajectory.uniqueWellboreIdentifier,
            tvdMslArr: trajectory.surveyPoints?.map((p) => p.tvdMsl) ?? [],
            mdArr: trajectory.surveyPoints?.map((p) => p.md) ?? [],
            eastingArr: trajectory.surveyPoints?.map((p) => p.easting) ?? [],
            northingArr: trajectory.surveyPoints?.map((p) => p.northing) ?? [],
            completionArr: Array(trajectory.surveyPoints?.length ?? 0).fill(CompletionType.NONE),
            flowType: null,
        };
    });
}

/**
 * Filters an array of intermediate WellTrajectoryData based on flow types.
 * Returns a NEW filtered array (still WellTrajectoryData[]).
 */
export function filterDataByFlow(
    data: WellTrajectoryData[],
    flowDataArr: WellFlowData_api[],
    requestedFlowVectors: FlowVector_api[],
): WellTrajectoryData[] {
    // (Keep same logic as previous version, still returns WellTrajectoryData[])
    // It assigns the flowType to the whole well object,
    // which will be inherited by segments later.
    const flowVectorSet = new Set(requestedFlowVectors);
    const flowDataMap = new Map<string, FlowType>();

    for (const flowData of flowDataArr) {
        const identifier = flowData.well_uwi; // Or correct identifier
        if (identifier) {
            const flowType = determineFlowType(flowData, flowVectorSet);
            if (flowType !== null && !flowDataMap.has(identifier)) {
                flowDataMap.set(identifier, flowType);
            }
        }
    }

    const filteredData = data
        .filter((wellData) => flowDataMap.has(wellData.uniqueWellboreIdentifier))
        .map((wellData) => ({
            ...wellData,
            flowType: flowDataMap.get(wellData.uniqueWellboreIdentifier) ?? null,
        }));

    return filteredData;
}

export function segmentDataByCompletionAndStratigraphy( // Renamed
    processedWellDataWithRefSys: Array<{ wellData: WellTrajectoryData; refSystem: IntersectionReferenceSystem }>,
    completionDataArr: WellboreCompletionSmda_api[],
    // *** New Param ***
    stratIntervalsByWellbore: Map<string, Array<{ entryMd: number; exitMd: number }>>,
    requestedCompletionTypes: CompletionType[],
    filterStartDateStr: string | null,
    filterEndDateStr: string | null,
): WellTrajectorySegment[] {
    const completionTypeSet = new Set(requestedCompletionTypes);
    const filterStartMs = filterStartDateStr ? new Date(filterStartDateStr).getTime() : null;
    const filterEndMs = filterEndDateStr ? new Date(filterEndDateStr).getTime() : null;

    // Group completions by wellbore
    const completionsByWellbore = new Map<string, WellboreCompletionSmda_api[]>();
    completionDataArr.forEach((comp) => {
        if (comp.wellboreUuid) {
            if (!completionsByWellbore.has(comp.wellboreUuid)) {
                completionsByWellbore.set(comp.wellboreUuid, []);
            }
            completionsByWellbore.get(comp.wellboreUuid)?.push(comp);
        }
    });

    // Process each well, passing strat intervals for that well
    const allSegments = processedWellDataWithRefSys.flatMap(({ wellData, refSystem }) => {
        // Retrieve strat intervals for the current well (might be undefined if none exist)
        const wellStratIntervals = stratIntervalsByWellbore.get(wellData.wellboreUuid);
        // If no strat intervals exist for this well, skip the well
        if (!wellStratIntervals) {
            return [];
        }
        // Call the single-well processor, passing the strat intervals
        return processSingleWellForSegments_Interpolated(
            wellData,
            refSystem,
            completionsByWellbore.get(wellData.wellboreUuid),
            wellStratIntervals, // Pass strat intervals for this well
            completionTypeSet,
            filterStartMs,
            filterEndMs,
        );
    });
    return allSegments;
}

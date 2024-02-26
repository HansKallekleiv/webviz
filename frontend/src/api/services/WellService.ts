/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlockedWellLog } from '../models/BlockedWellLog';
import type { WellBoreHeader } from '../models/WellBoreHeader';
import type { WellBorePicksAndStratigraphicUnits } from '../models/WellBorePicksAndStratigraphicUnits';
import type { WellBoreTrajectory } from '../models/WellBoreTrajectory';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WellService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Blocked Well Log Names
     * Retrieve the available blocked well log names for the case
     * @param caseUuid Sumo case uuid
     * @param ensembleName Iteration name
     * @returns string Successful Response
     * @throws ApiError
     */
    public getBlockedWellLogNames(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<string>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/bw_names',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Blocked Well Logs
     * Retrieve the available blocked well logs for the case
     * @param caseUuid Sumo case uuid
     * @param ensembleName Iteration name
     * @param wellName Well name
     * @returns BlockedWellLog Successful Response
     * @throws ApiError
     */
    public getBlockedWellLogs(
        caseUuid: string,
        ensembleName: string,
        wellName: string,
    ): CancelablePromise<Array<BlockedWellLog>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/bw_logs',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'well_name': wellName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Well Headers
     * Get well headers for all wells in the field
     * @param caseUuid Sumo case uuid
     * @returns WellBoreHeader Successful Response
     * @throws ApiError
     */
    public getWellHeaders(
        caseUuid: string,
    ): CancelablePromise<Array<WellBoreHeader>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/well_headers/',
            query: {
                'case_uuid': caseUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Field Well Trajectories
     * Get well trajectories for field
     * @param caseUuid Sumo case uuid
     * @param uniqueWellboreIdentifiers Optional subset of well names
     * @returns WellBoreTrajectory Successful Response
     * @throws ApiError
     */
    public getFieldWellTrajectories(
        caseUuid: string,
        uniqueWellboreIdentifiers?: Array<string>,
    ): CancelablePromise<Array<WellBoreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/field_well_trajectories/',
            query: {
                'case_uuid': caseUuid,
                'unique_wellbore_identifiers': uniqueWellboreIdentifiers,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Well Trajectories
     * Get well trajectories
     * @param wellboreUuids Wellbore uuids
     * @returns WellBoreTrajectory Successful Response
     * @throws ApiError
     */
    public getWellTrajectories(
        wellboreUuids: Array<string>,
    ): CancelablePromise<Array<WellBoreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/well_trajectories/',
            query: {
                'wellbore_uuids': wellboreUuids,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Picks And Stratigraphic Units
     * Get well bore picks for a single well bore
     * @param caseUuid Sumo case uuid
     * @param wellboreUuid Wellbore uuid
     * @returns WellBorePicksAndStratigraphicUnits Successful Response
     * @throws ApiError
     */
    public getWellborePicksAndStratigraphicUnits(
        caseUuid: string,
        wellboreUuid: string,
    ): CancelablePromise<WellBorePicksAndStratigraphicUnits> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_picks_and_stratigraphic_units/',
            query: {
                'case_uuid': caseUuid,
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}

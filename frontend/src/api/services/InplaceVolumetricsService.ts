/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_get_result_data_per_realization } from '../models/Body_get_result_data_per_realization';
import type { InplaceVolumetricData } from '../models/InplaceVolumetricData';
import type { InplaceVolumetricResponseNames } from '../models/InplaceVolumetricResponseNames';
import type { InplaceVolumetricsTableDefinition } from '../models/InplaceVolumetricsTableDefinition';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class InplaceVolumetricsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Table Definitions
     * Get the volumetric tables definitions for a given ensemble.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns InplaceVolumetricsTableDefinition Successful Response
     * @throws ApiError
     */
    public getTableDefinitions(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Array<InplaceVolumetricsTableDefinition>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/inplace_volumetrics/table_definitions/',
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
     * Get Result Data Per Realization
     * Get volumetric data summed per realization for a given table, result and categories/index filter.
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @param tableName Table name
     * @param resultName The name of the volumetric result/response
     * @param realizations Realizations
     * @param requestBody
     * @param primaryGroupBy Primary group by column
     * @param secondaryGroupBy Secondary group by column
     * @returns InplaceVolumetricData Successful Response
     * @throws ApiError
     */
    public getResultDataPerRealization(
        caseUuid: string,
        ensembleName: string,
        tableName: string,
        resultName: InplaceVolumetricResponseNames,
        realizations: Array<number>,
        requestBody: Body_get_result_data_per_realization,
        primaryGroupBy?: string,
        secondaryGroupBy?: string,
    ): CancelablePromise<InplaceVolumetricData> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/inplace_volumetrics/result_data_per_realization/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
                'table_name': tableName,
                'result_name': resultName,
                'primary_group_by': primaryGroupBy,
                'secondary_group_by': secondaryGroupBy,
                'realizations': realizations,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}

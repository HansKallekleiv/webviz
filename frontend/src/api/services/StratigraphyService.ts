/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StratigraphicUnit } from '../models/StratigraphicUnit';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class StratigraphyService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Stratigraphic Units
     * @param caseUuid Sumo case uuid
     * @returns StratigraphicUnit Successful Response
     * @throws ApiError
     */
    public getStratigraphicUnits(
        caseUuid: string,
    ): CancelablePromise<Array<StratigraphicUnit>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/stratigraphy/stratigraphic_units/',
            query: {
                'case_uuid': caseUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}

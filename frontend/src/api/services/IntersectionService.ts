/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IntersectionPolyLine } from '../models/IntersectionPolyLine';
import type { StaticSurfaceRealizationsIntersectionRequest } from '../models/StaticSurfaceRealizationsIntersectionRequest';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class IntersectionService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Compute Static Surface Realizations
     * Get a polyline for a well for an intersection
     * @param requestBody
     * @returns IntersectionPolyLine Successful Response
     * @throws ApiError
     */
    public computeStaticSurfaceRealizations(
        requestBody: StaticSurfaceRealizationsIntersectionRequest,
    ): CancelablePromise<Array<IntersectionPolyLine>> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/intersection/static_surface_realizations',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

}

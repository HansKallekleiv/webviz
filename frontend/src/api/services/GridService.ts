/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GridGeometry } from '../models/GridGeometry';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class GridService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Grid Geometry
     * Get a grid
     * @returns GridGeometry Successful Response
     * @throws ApiError
     */
    public gridGeometry(): CancelablePromise<GridGeometry> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/grid/grid_geometry',
        });
    }

}

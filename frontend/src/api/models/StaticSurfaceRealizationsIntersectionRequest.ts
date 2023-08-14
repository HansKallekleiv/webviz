/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { IntersectionSpec } from './IntersectionSpec';

export type StaticSurfaceRealizationsIntersectionRequest = {
    intersection_spec: IntersectionSpec;
    /**
     * Sumo case uuid
     */
    case_uuid: string;
    /**
     * Ensemble name
     */
    ensemble_name: string;
    /**
     * Surface name
     */
    name: string;
    /**
     * Surface attribute
     */
    attribute: string;
    /**
     * Realization
     */
    realizations?: Array<number>;
};


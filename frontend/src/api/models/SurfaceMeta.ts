/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { StratigraphicFeature } from './StratigraphicFeature';
import type { SurfaceAttributeType } from './SurfaceAttributeType';

export type SurfaceMeta = {
    stratigraphic_name: string;
    stratigraphic_name_is_official: boolean;
    stratigraphic_feature?: StratigraphicFeature;
    attribute_name: string;
    attribute_type: SurfaceAttributeType;
    iso_date_or_interval?: string;
    is_observation: boolean;
    value_min?: number;
    value_max?: number;
};


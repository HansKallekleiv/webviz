/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { StratigraphicFeature } from './StratigraphicFeature';
import type { SurfaceAttributeType } from './SurfaceAttributeType';

export type SurfaceMeta = {
    stratigraphic_name: string;
    stratigraphic_identifier: (string | null);
    stratigraphic_name_is_official: boolean;
    relative_stratigraphic_level: number;
    stratigraphic_unit_parent: (string | null);
    stratigraphic_feature: (StratigraphicFeature | null);
    attribute_name: string;
    attribute_type: SurfaceAttributeType;
    iso_date_or_interval: (string | null);
    is_observation: boolean;
    value_min: (number | null);
    value_max: (number | null);
};


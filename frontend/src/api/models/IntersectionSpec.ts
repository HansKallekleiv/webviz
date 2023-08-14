/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SmdaWellIdent } from './SmdaWellIdent';

export type IntersectionSpec = {
    source: (SmdaWellIdent | string);
    extent?: Array<number>;
};


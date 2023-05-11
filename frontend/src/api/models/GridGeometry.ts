/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { B64EncodedNumpyArray } from './B64EncodedNumpyArray';

export type GridGeometry = {
    polys: B64EncodedNumpyArray;
    points: B64EncodedNumpyArray;
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    zmin: number;
    zmax: number;
};


import { GridSurface_api } from "@api";
import { b64DecodeFloatArrayToFloat32, b64DecodeUintArrayToUint32 } from "@modules_shared/base64";

// Data structure for the transformed GridSurface data
// Removes the base64 encoded data and replaces them with typed arrays
export type GridSurface_trans = Omit<GridSurface_api, "points_b64arr" | "polys_b64arr"> & {
    pointsFloat32Arr: Float32Array;
    polysUint32Arr: Uint32Array;
};

export function transformTableData(base64String: string): any {
    const startTS = performance.now();

    const binaryString = atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(new ArrayBuffer(len));

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    console.debug(`transformTableData() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return bytes;
}

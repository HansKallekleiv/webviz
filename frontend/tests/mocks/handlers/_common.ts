import { HttpResponse } from "msw";
import type { StrictResponse } from "msw";

/** Error response shaped like the backend's exception handler (`{ error: { type, message } }`). */
export function errorResponse(status: number, message: string): StrictResponse<never> {
    const response = HttpResponse.json<object>({ error: { type: "GeneralError", message } }, { status });
    return response as unknown as StrictResponse<never>;
}

/** Inverse of the backend's `encode_as_uint_list_str`, e.g. "1-3!5" -> [1, 2, 3, 5]. */
export function decodeUintListStr(encoded: string): number[] {
    if (encoded.length === 0) return [];

    const result = new Set<number>();
    for (const element of encoded.split("!")) {
        const [start, end] = element.split("-").map(Number);
        for (let value = start; value <= (end ?? start); value++) {
            result.add(value);
        }
    }
    return [...result].sort((a, b) => a - b);
}

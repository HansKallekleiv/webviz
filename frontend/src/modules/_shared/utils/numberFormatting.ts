import { createScaledNumberWithSuffix } from "./numberSuffixFormatting";

/**
 * Formats a number to a string with a maximum number of decimal places.
 * Uses suffixes (K, M, B, T) for large numbers, and exponential notation for very small ones.
 * @param value The number to format.
 * @param maxNumDecimalPlaces The maximum number of decimal places to include in the formatted string.
 * @returns The formatted string representation of the number.
 */
export function formatNumber(value: number, maxNumDecimalPlaces: number = 3): string {
    if (!isFinite(value)) return value.toString();
    if (value === 0) return "0";

    const absValue = Math.abs(value);

    // Suffixes for large numbers
    const suffixes: [number, string][] = [
        [1e12, "T"],
        [1e9, "B"],
        [1e6, "M"],
        [1e3, "K"],
    ];

    for (const [threshold, suffix] of suffixes) {
        if (absValue >= threshold && absValue >= 10000) {
            const scaled = value / threshold;
            return Number.isInteger(scaled) ? `${scaled}${suffix}` : `${scaled.toFixed(maxNumDecimalPlaces)}${suffix}`;
        }
    }

    // Exponential for small values too small to represent with fixed decimals
    const fixed = value.toFixed(maxNumDecimalPlaces);
    if (parseFloat(fixed) === 0 && absValue < 1) {
        return value.toExponential(maxNumDecimalPlaces);
    }

    // Omit decimals for integers
    return Number.isInteger(value) ? value.toString() : fixed;
}

/**
 * Formats a value into a compact string representation with adaptive precision.
 * * - Returns `"-"` if the value is null.
 * - Returns strings as-is.
 * - Scales numbers using SI suffixes (k, M, G).
 * - Adjusts decimal precision based on magnitude (4 decimals for <0.01, 3 for <0.1, otherwise 2).
 * * @param value The value to format (string, number, or null).
 * @returns A formatted string ready for display.
 */
export function formatValueWithAdaptivePrecision(value: string | number | null): string {
    if (value === null) return "-";
    if (typeof value === "string") return value;

    const { scaledValue, suffix } = createScaledNumberWithSuffix(value);

    // Determine decimal places based on magnitude ("Adaptive Precision")
    let decimalPlaces = 2;
    if (Math.abs(scaledValue) < 0.01) {
        decimalPlaces = 4;
    } else if (Math.abs(scaledValue) < 0.1) {
        decimalPlaces = 3;
    }

    return `${scaledValue.toFixed(decimalPlaces)} ${suffix}`;
}

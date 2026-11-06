import { describe, expect, test } from "vitest";

import {
    convertGasPriceToSimulatorUnit,
    convertGasToOilEquivalentFactorToSimulatorUnit,
    convertOilPriceFromSimulatorUnit,
    convertOilPriceToSimulatorUnit,
    makeFixedOilEquivalentDivisor,
    volumeUnitInSm3,
} from "@modules/EconomicScreening/utils/unitConversion";

describe("volumeUnitInSm3", () => {
    test("recognises units regardless of casing and padding", () => {
        expect(volumeUnitInSm3(" sm3 ")).toBe(1);
    });

    test("returns null for unknown units", () => {
        expect(volumeUnitInSm3("BANANAS")).toBeNull();
    });
});

describe("convertOilPriceToSimulatorUnit", () => {
    test("passes a per-barrel price through for a barrel simulator unit", () => {
        expect(convertOilPriceToSimulatorUnit(70, "STB")).toBeCloseTo(70, 10);
    });

    test("scales a per-barrel price up to a per-Sm³ price", () => {
        const result = convertOilPriceToSimulatorUnit(70, "SM3");

        expect(result).toBeCloseTo(70 * 6.2898, 2);
    });

    test("returns null for an unrecognised simulator unit", () => {
        expect(convertOilPriceToSimulatorUnit(70, "???")).toBeNull();
    });
});

describe("convertOilPriceFromSimulatorUnit", () => {
    test("converts a per-Sm³ break-even price to a per-barrel price", () => {
        expect(convertOilPriceFromSimulatorUnit(70 * 6.2898, "SM3")).toBeCloseTo(70, 2);
    });

    test("returns null for an unrecognised simulator unit", () => {
        expect(convertOilPriceFromSimulatorUnit(70, "???")).toBeNull();
    });
});

describe("convertGasPriceToSimulatorUnit", () => {
    test("passes a per-Sm³ price through for an Sm³ simulator unit", () => {
        expect(convertGasPriceToSimulatorUnit(0.3, "SM3")).toBeCloseTo(0.3, 10);
    });

    test("scales a per-Sm³ price up to a per-Mscf price for an Mscf simulator unit", () => {
        expect(convertGasPriceToSimulatorUnit(0.3, "MSCF")).toBeCloseTo(0.3 * 28.3168, 3);
    });
});

describe("convertGasToOilEquivalentFactorToSimulatorUnit", () => {
    test("is unchanged when both vectors are in Sm³", () => {
        expect(convertGasToOilEquivalentFactorToSimulatorUnit(1000, "SM3", "SM3")).toBeCloseTo(1000, 10);
    });

    test("accounts for gas reported in Mscf", () => {
        const divisor = convertGasToOilEquivalentFactorToSimulatorUnit(1000, "SM3", "MSCF");

        // 1000 Sm³ of gas is roughly 35.3 Mscf, so the divisor shrinks accordingly.
        expect(divisor).toBeCloseTo(35.3147, 3);
    });

    test("returns null when either unit is unknown", () => {
        expect(convertGasToOilEquivalentFactorToSimulatorUnit(1000, "SM3", "???")).toBeNull();
    });
});

describe("makeFixedOilEquivalentDivisor", () => {
    test("fixes the SODIR convention of 1000 Sm³ gas per Sm³ oil equivalent", () => {
        expect(makeFixedOilEquivalentDivisor("SM3", "SM3")).toBeCloseTo(1000, 10);
    });

    test("applies the convention after unit conversion", () => {
        expect(makeFixedOilEquivalentDivisor("BBL", "MSCF")).toBeCloseTo(
            convertGasToOilEquivalentFactorToSimulatorUnit(1000, "BBL", "MSCF")!,
            10,
        );
        expect(makeFixedOilEquivalentDivisor("SM3", "MSCF")).toBeCloseTo(35.3147, 3);
    });

    test("returns null when either unit is unknown", () => {
        expect(makeFixedOilEquivalentDivisor("???", "SM3")).toBeNull();
    });
});

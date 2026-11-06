import { DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR } from "@modules/EconomicScreening/typesAndEnums";

/** One barrel in Sm³. */
export const SM3_PER_BBL = 0.158987294928;
const SM3_PER_STB = SM3_PER_BBL;
const SM3_PER_SCF = 0.028316846592;
const SM3_PER_MSCF = 1000 * SM3_PER_SCF;

/** Size of one unit expressed in Sm³. */
const VOLUME_UNIT_IN_SM3: Record<string, number> = {
    SM3: 1,
    "SM³": 1,
    M3: 1,
    STB: SM3_PER_STB,
    BBL: SM3_PER_STB,
    RB: SM3_PER_STB,
    SCF: SM3_PER_SCF,
    MSCF: SM3_PER_MSCF,
    MMSCF: 1000 * SM3_PER_MSCF,
    KSM3: 1000,
    MSM3: 1e6,
};

export function normalizeVolumeUnit(rawUnit: string): string {
    return rawUnit.trim().toUpperCase();
}

/**
 * Returns the size of one simulator volume unit in Sm³, or null when the unit is not recognised.
 */
export function volumeUnitInSm3(rawUnit: string): number | null {
    return VOLUME_UNIT_IN_SM3[normalizeVolumeUnit(rawUnit)] ?? null;
}

/** Rescales an oil price per bbl into a price per unit of the simulator volume unit. */
export function convertOilPriceToSimulatorUnit(pricePerBbl: number, simulatorUnit: string): number | null {
    const simulatorUnitInSm3 = volumeUnitInSm3(simulatorUnit);
    if (simulatorUnitInSm3 === null) {
        return null;
    }
    return (pricePerBbl * simulatorUnitInSm3) / SM3_PER_STB;
}

/** Rescales a price per simulator volume unit into a price per bbl. */
export function convertOilPriceFromSimulatorUnit(price: number, simulatorUnit: string): number | null {
    const simulatorUnitInSm3 = volumeUnitInSm3(simulatorUnit);
    if (simulatorUnitInSm3 === null) {
        return null;
    }
    return (price * SM3_PER_STB) / simulatorUnitInSm3;
}

/** Rescales a gas price per Sm³ into a price per unit of the simulator volume unit. */
export function convertGasPriceToSimulatorUnit(pricePerSm3: number, simulatorUnit: string): number | null {
    const simulatorUnitInSm3 = volumeUnitInSm3(simulatorUnit);
    if (simulatorUnitInSm3 === null) {
        return null;
    }
    return pricePerSm3 * simulatorUnitInSm3;
}

/**
 * Translates "f Sm³ gas per Sm³ oil" into the divisor to apply to raw gas volumes so that the
 * result is an oil equivalent expressed in the oil vector's own unit.
 */
export function convertGasToOilEquivalentFactorToSimulatorUnit(
    factorSm3GasPerSm3Oil: number,
    oilSimulatorUnit: string,
    gasSimulatorUnit: string,
): number | null {
    const oilUnitInSm3 = volumeUnitInSm3(oilSimulatorUnit);
    const gasUnitInSm3 = volumeUnitInSm3(gasSimulatorUnit);
    if (oilUnitInSm3 === null || gasUnitInSm3 === null) {
        return null;
    }
    return (factorSm3GasPerSm3Oil * oilUnitInSm3) / gasUnitInSm3;
}

/**
 * SODIR's fixed convention of 1000 Sm³ gas per Sm³ oil equivalent, applied after unit conversion so
 * that the divisor matches the source vectors' own units.
 */
export function makeFixedOilEquivalentDivisor(oilSimulatorUnit: string, gasSimulatorUnit: string): number | null {
    return convertGasToOilEquivalentFactorToSimulatorUnit(
        DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR,
        oilSimulatorUnit,
        gasSimulatorUnit,
    );
}

export enum EconomicMeasure {
    NPV = "NPV",
    IRR = "IRR",
    BREAK_EVEN_OIL_PRICE = "BREAK_EVEN_OIL_PRICE",
    DISCOUNTED_OIL_VOLUME = "DISCOUNTED_OIL_VOLUME",
    DISCOUNTED_SALES_GAS_VOLUME = "DISCOUNTED_SALES_GAS_VOLUME",
    DISCOUNTED_OIL_EQUIVALENTS = "DISCOUNTED_OIL_EQUIVALENTS",
}

export const EconomicMeasureEnumToStringMapping: Record<EconomicMeasure, string> = {
    [EconomicMeasure.NPV]: "Net present value",
    [EconomicMeasure.IRR]: "Internal rate of return",
    [EconomicMeasure.BREAK_EVEN_OIL_PRICE]: "Break-even oil price",
    [EconomicMeasure.DISCOUNTED_OIL_VOLUME]: "Discounted oil volume",
    [EconomicMeasure.DISCOUNTED_SALES_GAS_VOLUME]: "Discounted sales gas volume",
    [EconomicMeasure.DISCOUNTED_OIL_EQUIVALENTS]: "Discounted oil equivalents",
};

export enum BreakEvenSlopeDirection {
    POSITIVE = "POSITIVE",
    NEGATIVE = "NEGATIVE",
}

export enum IrrStatus {
    CONVERGED = "CONVERGED",
    NO_FINITE_ROOT = "NO_FINITE_ROOT",
    NON_CONVENTIONAL = "NON_CONVENTIONAL",
    OUT_OF_DOMAIN = "OUT_OF_DOMAIN",
}

export enum Currency {
    NOK = "NOK",
    USD = "USD",
}

export enum OilPriceBasis {
    PER_SM3 = "PER_SM3",
    PER_BBL = "PER_BBL",
}

export const OilPriceBasisEnumToStringMapping: Record<OilPriceBasis, string> = {
    [OilPriceBasis.PER_SM3]: "per Sm³",
    [OilPriceBasis.PER_BBL]: "per bbl",
};

export enum GasPriceBasis {
    PER_SM3 = "PER_SM3",
    PER_MSCF = "PER_MSCF",
}

export const GasPriceBasisEnumToStringMapping: Record<GasPriceBasis, string> = {
    [GasPriceBasis.PER_SM3]: "per Sm³",
    [GasPriceBasis.PER_MSCF]: "per Mscf",
};

export enum DistributionPlotType {
    EXCEEDANCE = "EXCEEDANCE",
    HISTOGRAM = "HISTOGRAM",
}

export const DistributionPlotTypeEnumToStringMapping: Record<DistributionPlotType, string> = {
    [DistributionPlotType.EXCEEDANCE]: "Exceedance",
    [DistributionPlotType.HISTOGRAM]: "Histogram",
};

export enum CashFlowProfileType {
    ANNUAL_OIL_VOLUME = "ANNUAL_OIL_VOLUME",
    ANNUAL_SALES_GAS_VOLUME = "ANNUAL_SALES_GAS_VOLUME",
    ANNUAL_NET_CASH_FLOW = "ANNUAL_NET_CASH_FLOW",
    CUMULATIVE_DISCOUNTED_CASH_FLOW = "CUMULATIVE_DISCOUNTED_CASH_FLOW",
}

export const CashFlowProfileTypeEnumToStringMapping: Record<CashFlowProfileType, string> = {
    [CashFlowProfileType.ANNUAL_OIL_VOLUME]: "Annual oil volume",
    [CashFlowProfileType.ANNUAL_SALES_GAS_VOLUME]: "Annual sales gas volume",
    [CashFlowProfileType.ANNUAL_NET_CASH_FLOW]: "Annual net cash flow",
    [CashFlowProfileType.CUMULATIVE_DISCOUNTED_CASH_FLOW]: "Cumulative discounted cash flow",
};

export enum ResultMode {
    DISTRIBUTION = "DISTRIBUTION",
    TIME_PROFILE = "TIME_PROFILE",
    ALL_RESULTS = "ALL_RESULTS",
}

export const ResultModeEnumToStringMapping: Record<ResultMode, string> = {
    [ResultMode.DISTRIBUTION]: "Distribution",
    [ResultMode.TIME_PROFILE]: "Time profile",
    [ResultMode.ALL_RESULTS]: "All results",
};

/** A displayed realization, tied to the ensemble it was chosen in. Null realization means Aggregate. */
export type RealizationSelection = {
    ensembleIdentString: string | null;
    realization: number | null;
};

/** Yearly CAPEX/OPEX. For a delta ensemble the values are interpreted as delta costs. */
export type CostProfileEntry = {
    year: number;
    capex: number;
    opex: number;
};

export enum CostDraftStatus {
    COMMITTED = "COMMITTED",
    /** Valid, but not yet committed by the debounce. */
    PENDING = "PENDING",
    INVALID = "INVALID",
}

export type PriceAssumptions = {
    currency: Currency;
    /** Null means unspecified. Zero intentionally omits oil revenue. */
    oilPrice: number | null;
    oilPriceBasis: OilPriceBasis;
    /** Null means unspecified. Zero intentionally omits gas revenue. */
    gasPrice: number | null;
    gasPriceBasis: GasPriceBasis;
};

export type EconomicAssumptions = {
    discountRatePercent: number;
};

export const DEFAULT_DISCOUNT_RATE_PERCENT = 8;

/** SODIR convention, fixed: 1000 Sm³ gas equals 1 Sm³ oil equivalent, applied after unit conversion. */
export const DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR = 1000;

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
    /** NPV is positive at every supported rate, or the costs come after the income. */
    NO_INVESTMENT = "NO_INVESTMENT",
    /** NPV is negative at every supported rate. */
    NEVER_RECOVERED = "NEVER_RECOVERED",
    /** More than one supported rate makes NPV zero. */
    MULTIPLE_ROOTS = "MULTIPLE_ROOTS",
    /** The rate could not be found within the supported range. */
    OUT_OF_DOMAIN = "OUT_OF_DOMAIN",
}

/** All prices and costs are in USD; oil is priced per bbl and gas per Sm³. */
export const CURRENCY = "USD";
export const OIL_PRICE_UNIT = "USD/bbl";
export const GAS_PRICE_UNIT = "USD/Sm³";
/** Costs are entered in million USD and stored in USD. */
export const COST_INPUT_UNIT = "MUSD";
export const USD_PER_COST_INPUT_UNIT = 1_000_000;

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
    /** USD/bbl. Null means unspecified. Zero intentionally omits oil revenue. */
    oilPrice: number | null;
    /** USD/Sm³. Null means unspecified. Zero intentionally omits gas revenue. */
    gasPrice: number | null;
};

export type EconomicAssumptions = {
    discountRatePercent: number;
    /** Not applied to delta ensembles. */
    stopOpexAfterLastProduction: boolean;
};

export const DEFAULT_DISCOUNT_RATE_PERCENT = 8;

/** SODIR convention, fixed: 1000 Sm³ gas equals 1 Sm³ oil equivalent, applied after unit conversion. */
export const DEFAULT_GAS_TO_OIL_EQUIVALENT_FACTOR = 1000;

import type { ReactNode } from "react";

import { useAtom, useAtomValue } from "jotai";

import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";

import { GAS_PRICE_UNIT, OIL_PRICE_UNIT } from "../../../typesAndEnums";
import { getFieldIssueText } from "../../../utils/setupReadiness";
import { describeSalesGasSource, getSalesGasSourceWarning } from "../../../utils/vectorResolution";
import { gasPriceAtom, oilPriceAtom } from "../../atoms/baseAtoms";
import { activeVectorListQueryAtom, hasOilProductionVectorAtom, salesGasStrategyAtom } from "../../atoms/derivedAtoms";
import { GAS_PRICE_HELP, OIL_PRICE_HELP, SALES_GAS_SOURCE_HELP } from "../../helpTexts";
import { NUMBER_INPUT_DEBOUNCE_MS, setupFieldClassName, type SettingsSectionProps } from "../../settingsSections";

export function PricesSection(props: SettingsSectionProps): ReactNode {
    const [oilPrice, setOilPrice] = useAtom(oilPriceAtom);
    const [gasPrice, setGasPrice] = useAtom(gasPriceAtom);
    const vectorListQuery = useAtomValue(activeVectorListQueryAtom);
    const hasOilProductionVector = useAtomValue(hasOilProductionVectorAtom);
    const salesGasStrategy = useAtomValue(salesGasStrategyAtom);

    const [immediateOilPrice, setImmediateOilPrice] = useDebouncedOnChange(
        oilPrice,
        (newValue: number | null) => setOilPrice(newValue),
        NUMBER_INPUT_DEBOUNCE_MS,
    );
    const [immediateGasPrice, setImmediateGasPrice] = useDebouncedOnChange(
        gasPrice,
        (newValue: number | null) => setGasPrice(newValue),
        NUMBER_INPUT_DEBOUNCE_MS,
    );

    const isVectorListReady = vectorListQuery.isSuccess && !vectorListQuery.isFetching;

    return (
        <Setting.Section {...props.sectionProps}>
            {hasOilProductionVector && (
                <Setting.Field
                    label={`Oil price [${OIL_PRICE_UNIT}]`}
                    help={{ title: "Oil price", content: OIL_PRICE_HELP }}
                    contentClassName={setupFieldClassName("oilPrice")}
                    warningAnnotation={getFieldIssueText(props.readiness, "oilPrice")}
                    stacked
                >
                    <NumberInput
                        value={immediateOilPrice}
                        layoutClassName="[&_input]:text-right"
                        placeholder="Enter price"
                        onValueChange={setImmediateOilPrice}
                    />
                </Setting.Field>
            )}
            <Setting.Field
                label={`Gas price [${GAS_PRICE_UNIT}]`}
                help={{ title: "Gas price", content: GAS_PRICE_HELP }}
                contentClassName={setupFieldClassName("gasPrice")}
                warningAnnotation={getFieldIssueText(props.readiness, "gasPrice")}
                infoAnnotation={
                    gasPrice === 0
                        ? "Gas revenue excluded; gas-volume outputs still require resolved gas data."
                        : undefined
                }
                stacked
            >
                <NumberInput
                    value={immediateGasPrice}
                    layoutClassName="[&_input]:text-right"
                    placeholder="Enter price"
                    onValueChange={setImmediateGasPrice}
                />
            </Setting.Field>
            <Setting.Field
                label="Sales gas source"
                help={{ title: "Sales gas source", content: SALES_GAS_SOURCE_HELP }}
                loadingOverlay={vectorListQuery.isFetching}
                errorOverlay={vectorListQuery.isError ? "Could not load the vector list." : undefined}
                warningAnnotation={
                    isVectorListReady ? (getSalesGasSourceWarning(salesGasStrategy) ?? undefined) : undefined
                }
                stacked
            >
                <span className="text-sm">{isVectorListReady ? describeSalesGasSource(salesGasStrategy) : ""}</span>
            </Setting.Field>
        </Setting.Section>
    );
}

import type { ReactNode } from "react";

import { useAtom, useAtomValue } from "jotai";

import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";

import { GAS_PRICE_UNIT, OIL_PRICE_UNIT } from "../../../typesAndEnums";
import { getFieldIssueText } from "../../../utils/setupReadiness";
import type { MissingComponentAssumptions, SalesGasStrategy } from "../../../utils/vectorResolution";
import { gasPriceAtom, missingComponentAssumptionsAtom, oilPriceAtom } from "../../atoms/baseAtoms";
import { activeVectorListQueryAtom, hasOilProductionVectorAtom, salesGasStrategyAtom } from "../../atoms/derivedAtoms";
import { validSelectedEnsembleIdentAtom } from "../../atoms/persistableFixableAtoms";
import { GAS_PRICE_HELP, makeSalesGasSourceHelp, OIL_PRICE_HELP } from "../../helpTexts";
import { NUMBER_INPUT_DEBOUNCE_MS, setupFieldClassName, type SettingsSectionProps } from "../../settingsSections";

export function PricesSection(props: SettingsSectionProps): ReactNode {
    const selectedEnsembleIdent = useAtomValue(validSelectedEnsembleIdentAtom);
    const [oilPrice, setOilPrice] = useAtom(oilPriceAtom);
    const [gasPrice, setGasPrice] = useAtom(gasPriceAtom);
    const [missingComponentAssumptionsByEnsemble, setMissingComponentAssumptionsByEnsemble] = useAtom(
        missingComponentAssumptionsAtom,
    );
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

    function setMissingComponentAssumption(key: keyof MissingComponentAssumptions, accepted: boolean) {
        const ensembleKey = selectedEnsembleIdent?.toString();
        if (!ensembleKey) {
            return;
        }
        setMissingComponentAssumptionsByEnsemble((current) => ({
            ...current,
            [ensembleKey]: { ...current[ensembleKey], [key]: accepted },
        }));
    }

    const selectedMissingComponentAssumptions =
        missingComponentAssumptionsByEnsemble[selectedEnsembleIdent?.toString() ?? ""];

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
                help={{ title: "Sales gas source", content: makeSalesGasSourceHelp(salesGasStrategy.kind) }}
                loadingOverlay={vectorListQuery.isFetching}
                errorOverlay={vectorListQuery.isError ? "Could not load the vector list." : undefined}
                contentClassName="flex flex-col gap-y-3xs"
                stacked
            >
                <>
                    <span className="text-sm">{makeSalesGasStatus(salesGasStrategy)}</span>
                </>
            </Setting.Field>
            {/* Label-less rows, so each checkbox is named by its own label rather than the field's. */}
            {salesGasStrategy.kind === "DERIVED" && !salesGasStrategy.hasGasInjection && (
                <Setting.Field
                    contentClassName={setupFieldClassName("injection")}
                    warningAnnotation={getFieldIssueText(props.readiness, "injection")}
                >
                    <CheckboxCompositions.WithLabel
                        label="Assume no gas injection"
                        checked={selectedMissingComponentAssumptions?.assumeMissingInjectionAsZero ?? false}
                        onCheckedChange={(checked) =>
                            setMissingComponentAssumption("assumeMissingInjectionAsZero", checked)
                        }
                        size="small"
                    />
                </Setting.Field>
            )}
            {salesGasStrategy.kind === "DERIVED" && !salesGasStrategy.hasGasConsumption && (
                <Setting.Field
                    contentClassName={setupFieldClassName("consumption")}
                    warningAnnotation={getFieldIssueText(props.readiness, "consumption")}
                >
                    <CheckboxCompositions.WithLabel
                        label="Assume no gas consumption"
                        checked={selectedMissingComponentAssumptions?.assumeMissingConsumptionAsZero ?? false}
                        onCheckedChange={(checked) =>
                            setMissingComponentAssumption("assumeMissingConsumptionAsZero", checked)
                        }
                        size="small"
                    />
                </Setting.Field>
            )}
        </Setting.Section>
    );
}

function makeSalesGasStatus(strategy: SalesGasStrategy): string {
    if (strategy.kind === "DIRECT") {
        return "Reported (FGST)";
    }
    if (strategy.kind === "DERIVED") {
        return "Calculated (FGPT - FGIT - FGCT)";
    }
    return "Unavailable";
}

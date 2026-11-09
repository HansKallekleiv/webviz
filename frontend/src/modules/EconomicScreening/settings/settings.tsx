import { useState, type ReactNode } from "react";

import { useAtomValue } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { Setting } from "@lib/components/Setting";

import type { Interfaces } from "../interfaces";
import { getResultRequirement, REQUIREMENT_NEEDS } from "../utils/eligibility";
import { getSetupReadiness } from "../utils/setupReadiness";

import {
    cashFlowProfileTypeAtom,
    costDraftStatusAtom,
    costProfileAtom,
    gasPriceAtom,
    oilPriceAtom,
    resultModeAtom,
    selectedMeasureAtom,
} from "./atoms/baseAtoms";
import { activeVectorListQueryAtom, hasOilProductionVectorAtom } from "./atoms/derivedAtoms";
import { validSelectedEnsembleIdentAtom } from "./atoms/persistableFixableAtoms";
import {
    evaluationHorizonStateAtom,
    selectedProductSupportAtom,
    sourceSnapshotAtom,
} from "./atoms/sourceSnapshotAtoms";
import { CostsSection } from "./components/sections/costsSection";
import { DataAndValuationSection } from "./components/sections/dataAndValuationSection";
import { PricesSection } from "./components/sections/pricesSection";
import { ResultsSection } from "./components/sections/resultsSection";
import { useGasOnlyMeasureFallback } from "./hooks/useGasOnlyMeasureFallback";
import { useMakeSettingsStatusWriterMessages } from "./hooks/useMakeSettingsStatusWriterMessages";
import { SettingsSection } from "./settingsSections";

export function Settings(props: ModuleSettingsProps<Interfaces>): ReactNode {
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const selectedMeasure = useAtomValue(selectedMeasureAtom);
    const cashFlowProfileType = useAtomValue(cashFlowProfileTypeAtom);
    const resultMode = useAtomValue(resultModeAtom);
    const requirement = getResultRequirement(resultMode, selectedMeasure, cashFlowProfileType);
    const needs = REQUIREMENT_NEEDS[requirement];
    const needsPrices = needs.oilRevenue || needs.gasRevenue;
    const needsCosts = needs.validCostDraft;

    // Prices and costs start closed unless the selected result needs them.
    const [closedSections, setClosedSections] = useState<SettingsSection[]>(() => [
        ...(needsPrices ? [] : [SettingsSection.PRICES]),
        ...(needsCosts ? [] : [SettingsSection.COSTS]),
    ]);
    const [previousNeeds, setPreviousNeeds] = useState({ needsPrices, needsCosts });

    // Opens a section once when the selected result starts needing it; closing it again is respected.
    if (needsPrices !== previousNeeds.needsPrices || needsCosts !== previousNeeds.needsCosts) {
        const toOpen = [
            ...(needsPrices && !previousNeeds.needsPrices ? [SettingsSection.PRICES] : []),
            ...(needsCosts && !previousNeeds.needsCosts ? [SettingsSection.COSTS] : []),
        ];
        setPreviousNeeds({ needsPrices, needsCosts });
        if (toOpen.length > 0) {
            setClosedSections((current) => current.filter((section) => !toOpen.includes(section)));
        }
    }

    function sectionProps(title: SettingsSection) {
        return {
            title,
            open: !closedSections.includes(title),
            onOpenChange: (open: boolean) =>
                setClosedSections((current) =>
                    open ? current.filter((section) => section !== title) : [...current, title],
                ),
        };
    }

    useGasOnlyMeasureFallback();

    const selectedEnsembleIdent = useAtomValue(validSelectedEnsembleIdentAtom);
    const oilPrice = useAtomValue(oilPriceAtom);
    const gasPrice = useAtomValue(gasPriceAtom);
    const costProfile = useAtomValue(costProfileAtom);
    const costDraftStatus = useAtomValue(costDraftStatusAtom);
    const evaluationHorizon = useAtomValue(evaluationHorizonStateAtom);
    const sourceSnapshot = useAtomValue(sourceSnapshotAtom);
    const selectedProductSupport = useAtomValue(selectedProductSupportAtom);
    const vectorListQuery = useAtomValue(activeVectorListQueryAtom);
    const hasOilProductionVector = useAtomValue(hasOilProductionVectorAtom);

    const setupReadiness = getSetupReadiness({
        hasEnsemble: selectedEnsembleIdent !== null,
        vectorListStatus: vectorListQuery.isError ? "ERROR" : vectorListQuery.isSuccess ? "READY" : "LOADING",
        snapshot: sourceSnapshot,
        hasOilVector: hasOilProductionVector,
        productSupport: selectedProductSupport,
        evaluationHorizon,
        oilPrice,
        gasPrice,
        costProfile,
        costDraftStatus,
        requirement,
    });
    const { handlePanelAnnotationsChange } = useMakeSettingsStatusWriterMessages(statusWriter, setupReadiness);

    return (
        <Setting.ScrollArea>
            <Setting.Panel onAnnotationsChange={handlePanelAnnotationsChange}>
                <DataAndValuationSection
                    sectionProps={sectionProps(SettingsSection.DATA_AND_VALUATION)}
                    readiness={setupReadiness}
                    workbenchSession={props.workbenchSession}
                />
                <PricesSection sectionProps={sectionProps(SettingsSection.PRICES)} readiness={setupReadiness} />
                <CostsSection sectionProps={sectionProps(SettingsSection.COSTS)} readiness={setupReadiness} />
                <ResultsSection sectionProps={sectionProps(SettingsSection.RESULTS)} />
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}

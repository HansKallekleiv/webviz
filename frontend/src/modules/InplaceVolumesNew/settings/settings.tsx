import type React from "react";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { Slider } from "@lib/components/Slider";
import { Tooltip } from "@lib/components/Tooltip";
import { InplaceVolumesFilterComponent } from "@modules/_shared/components/InplaceVolumesFilterComponent";
import { HistogramType } from "@modules/_shared/histogram";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";
import { Info } from "@mui/icons-material";
import { useAtom, useAtomValue } from "jotai";

import type { Interfaces } from "../interfaces";
import { PlotType, plotTypeToStringMapping, type InplaceVolumesPlotOptions } from "../typesAndEnums";
import { BarSortBy } from "../view/utils/plotly/bar";

import {
    plotOptionsAtom,
    selectedIndexValueCriteriaAtom,
    selectedPlotTypeAtom,
    showTableAtom,
} from "./atoms/baseAtoms";
import { tableDefinitionsAccessorAtom } from "./atoms/derivedAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedFirstResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./atoms/persistableFixableAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";
import { makeColorByOptions, makeSubplotByOptions } from "./utils/plotDimensionUtils";

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const tableDefinitionsQueryResult = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);

    const [selectedTableNames, setSelectedTableNames] = useAtom(selectedTableNamesAtom);

    const [selectedSelectorColumn, setSelectedSelectorColumn] = useAtom(selectedSelectorColumnAtom);

    const [selectedIndicesWithValues, setSelectedIndicesWithValues] = useAtom(selectedIndicesWithValuesAtom);

    const [selectedFirstResultName, setSelectedFirstResultName] = useAtom(selectedFirstResultNameAtom);
    const [selectedSubplotBy, setSelectedSubplotBy] = useAtom(selectedSubplotByAtom);

    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);

    const [selectedPlotType, setSelectedPlotType] = useAtom(selectedPlotTypeAtom);
    const [selectedIndexValueCriteria, setSelectedIndexValueCriteria] = useAtom(selectedIndexValueCriteriaAtom);
    const [plotOptions, setPlotOptions] = useAtom(plotOptionsAtom);
    const [showTable, setShowTable] = useAtom(showTableAtom);

    usePropagateAllApiErrorsToStatusWriter(tableDefinitionsQueryResult.errors, statusWriter);

    useApplyInitialSettingsToState(
        props.initialSettings,
        "selectedIndexValueCriteria",
        "string",
        setSelectedIndexValueCriteria,
    );
    function handleFilterChange(newFilter: InplaceVolumesFilterSettings) {
        setSelectedEnsembleIdents(newFilter.ensembleIdents);
        setSelectedTableNames(newFilter.tableNames);
        setSelectedIndicesWithValues(newFilter.indicesWithValues);
        setSelectedIndexValueCriteria(
            newFilter.allowIndicesValuesIntersection
                ? IndexValueCriteria.ALLOW_INTERSECTION
                : IndexValueCriteria.REQUIRE_EQUALITY,
        );
    }

    const resultNameOptions: DropdownOption<string>[] = tableDefinitionsAccessor
        .getResultNamesIntersection()
        .map((name) => ({ label: name, value: name, hoverText: createHoverTextForVolume(name) }));

    // Create selector options
    const selectorOptions: DropdownOption<string>[] = [
        ...tableDefinitionsAccessor.getCommonSelectorColumns().map((name) => ({ label: name, value: name })),
    ];

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames.value);
    const colorByOptions = makeColorByOptions(
        tableDefinitionsAccessor,
        selectedSubplotBy.value,
        selectedTableNames.value,
    );
    const plotTypeOptions: DropdownOption<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }

    const selectedFirstResultNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedFirstResultNameAtom);
    const selectedSelectorColumnAnnotations = useMakePersistableFixableAtomAnnotations(selectedSelectorColumnAtom);
    const selectedSubplotByAnnotations = useMakePersistableFixableAtomAnnotations(selectedSubplotByAtom);
    const selectedColorByAnnotations = useMakePersistableFixableAtomAnnotations(selectedColorByAtom);

    const handleOptionChange = <K extends keyof InplaceVolumesPlotOptions>(
        key: K,
        value: InplaceVolumesPlotOptions[K],
    ) => {
        setPlotOptions({
            ...plotOptions,
            [key]: value,
        });
    };

    // Individual handlers
    const handleHistogramTypeChange = (value: string | number) => {
        handleOptionChange("histogramType", value as HistogramType);
    };
    const handleHistogramBinsChange = (_: Event, value: number | number[]) => {
        if (Array.isArray(value)) {
            return;
        }
        handleOptionChange("histogramBins", value);
    };
    const handleBarSortByChange = (value: string | number) => {
        handleOptionChange("barSortBy", value as BarSortBy);
    };

    const handleSharedXAxisChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("sharedXAxis", checked);
    };

    const handleSharedYAxisChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("sharedYAxis", checked);
    };

    const handleShowStatisticalMarkersChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showStatisticalMarkers", checked);
    };
    const handleShowRealizationPointsChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showRealizationPoints", checked);
    };
    const handleHideConstantsChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("hideConstants", checked);
    };
    const handleShowPercentageInHistogramChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showPercentageInHistogram", checked);
    };
    const histogramContent = (
        <div>
            <SettingWrapper label="Histogram Type (when multiple series are present)">
                <Dropdown
                    options={[
                        { label: "Stacked vertically", value: HistogramType.Stack },
                        { label: "Side-by-side", value: HistogramType.Group },
                        { label: "Overlapping", value: HistogramType.Overlay },
                    ]}
                    value={plotOptions.histogramType}
                    onChange={handleHistogramTypeChange}
                />
            </SettingWrapper>
            <SettingWrapper label="Max number of histogram bins" key="number-of-histogram-bins">
                <Slider
                    value={plotOptions.histogramBins}
                    onChange={handleHistogramBinsChange}
                    min={5}
                    step={1}
                    max={30}
                    valueLabelDisplay="auto"
                />
            </SettingWrapper>
            <SettingWrapper>
                <Checkbox
                    label="Show percentages"
                    checked={plotOptions.showPercentageInHistogram}
                    onChange={handleShowPercentageInHistogramChange}
                />
            </SettingWrapper>
        </div>
    );
    const barContent = (
        <div>
            <SettingWrapper annotations={selectedSelectorColumnAnnotations}>
                <div className="flex gap-2">
                    <Label
                        wrapperClassName="mb-2 flex-1"
                        labelClassName="w-20 shrink-0"
                        position="left"
                        text="Create bar for each"
                    >
                        <Dropdown
                            value={selectedSelectorColumn.value}
                            options={selectorOptions}
                            onChange={setSelectedSelectorColumn}
                            disabled={selectedPlotType !== PlotType.BAR}
                        />
                    </Label>
                </div>
            </SettingWrapper>
            <Label position="left" labelClassName="w-20 shrink-0" text="Sort bars by">
                <Dropdown
                    options={[
                        { label: "X values (Category)", value: BarSortBy.Xvalues },
                        { label: "Y values (Response)", value: BarSortBy.Yvalues },
                    ]}
                    value={plotOptions.barSortBy}
                    onChange={handleBarSortByChange}
                />
            </Label>
        </div>
    );
    const plotMarkersContent = (
        <div>
            <SettingWrapper>
                <Checkbox
                    label="Show Statistical Markers"
                    checked={plotOptions.showStatisticalMarkers}
                    onChange={handleShowStatisticalMarkersChange}
                />
            </SettingWrapper>
            <SettingWrapper>
                <Checkbox
                    label="Show Realization Points"
                    checked={plotOptions.showRealizationPoints}
                    onChange={handleShowRealizationPointsChange}
                />
            </SettingWrapper>
        </div>
    );
    const layoutContent = (
        <div className="flex flex-col ">
            {/* <Label position="left" text="Hide plots where all values are equal"> */}
            <Checkbox
                label="Hide plots where all values are equal"
                checked={plotOptions.hideConstants}
                onChange={handleHideConstantsChange}
            />
            <Checkbox label="Shared X Axis" checked={plotOptions.sharedXAxis} onChange={handleSharedXAxisChange} />
            <Checkbox label="Shared Y Axis" checked={plotOptions.sharedYAxis} onChange={handleSharedYAxisChange} />
        </div>
    );
    const plotSettings = (
        <div>
            <CollapsibleGroup title="Data and plot type" expanded>
                <div className="flex flex-col gap-2">
                    <SettingWrapper annotations={selectedFirstResultNameAnnotations}>
                        <Label position="left" labelClassName="w-20 shrink-0" text="Response">
                            <Dropdown
                                value={selectedFirstResultName.value}
                                options={resultNameOptions}
                                onChange={setSelectedFirstResultName}
                            />
                        </Label>
                    </SettingWrapper>
                    <SettingWrapper annotations={selectedSubplotByAnnotations}>
                        <Label position="left" labelClassName="w-20 shrink-0" text="Subplot by">
                            <Dropdown
                                value={selectedSubplotBy.value}
                                options={subplotOptions}
                                onChange={setSelectedSubplotBy}
                            />
                        </Label>
                    </SettingWrapper>
                    <SettingWrapper annotations={selectedColorByAnnotations}>
                        <Label position="left" labelClassName="w-20 shrink-0" text="Color by">
                            <Dropdown
                                value={selectedColorBy.value}
                                options={colorByOptions}
                                onChange={setSelectedColorBy}
                            />
                        </Label>
                    </SettingWrapper>
                    <SettingWrapper>
                        <Label position="left" labelClassName="w-20 shrink-0" text="Plot Type">
                            <Dropdown
                                value={selectedPlotType}
                                options={plotTypeOptions}
                                onChange={setSelectedPlotType}
                            />
                        </Label>
                    </SettingWrapper>
                    <SettingWrapper>
                        <Label position="left" labelClassName="w-20 shrink-0" text="Show table">
                            <Checkbox
                                checked={showTable || selectedPlotType === PlotType.NONE}
                                onChange={(_e, checked) => setShowTable(checked)}
                            />
                        </Label>
                    </SettingWrapper>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Plot type settings">
                {selectedPlotType === PlotType.HISTOGRAM && histogramContent}
                {selectedPlotType === PlotType.BAR && barContent}
            </CollapsibleGroup>
            <CollapsibleGroup title="Plot layout">{layoutContent}</CollapsibleGroup>
            <CollapsibleGroup title="Plot markers">{plotMarkersContent}</CollapsibleGroup>
        </div>
    );

    return (
        <InplaceVolumesFilterComponent
            ensembleSet={ensembleSet}
            settingsContext={props.settingsContext}
            workbenchSession={props.workbenchSession}
            workbenchServices={props.workbenchServices}
            isPending={tableDefinitionsQueryResult.isLoading}
            availableTableNames={tableDefinitionsAccessor.getTableNamesIntersection()}
            availableIndicesWithValues={tableDefinitionsAccessor.getCommonIndicesWithValues()}
            selectedEnsembleIdents={selectedEnsembleIdents.value}
            selectedIndicesWithValues={selectedIndicesWithValues.value}
            selectedTableNames={selectedTableNames.value}
            selectedAllowIndicesValuesIntersection={
                selectedIndexValueCriteria === IndexValueCriteria.ALLOW_INTERSECTION
            }
            onChange={handleFilterChange}
            additionalSettings={plotSettings}
            areCurrentlySelectedTablesComparable={tableDefinitionsAccessor.getAreTablesComparable()}
            debounceMs={1500}
        />
    );
}

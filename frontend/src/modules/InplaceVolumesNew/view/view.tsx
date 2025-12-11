import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { useAtomValue } from "jotai";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import { firstResultNameAtom, plotTypeAtom, subplotByAtom } from "./atoms/baseAtoms";
import { areSelectedTablesComparableAtom } from "./atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "./atoms/queryAtoms";
import { PlotSection } from "./components/PlotSection";
import { TableSection } from "./components/TableSection";
import { useGroupedTableData } from "./hooks/useGroupedTableData";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { usePlotBuilder } from "./hooks/usePlotBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { useTableBuilder } from "./hooks/useTableBuilder";
import { makeInplaceVolumesPlotTitle } from "./utils/createTitle";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const colorSet = useColorSet(props.workbenchSettings);

    const hoveredRegion = useSubscribedValue("global.hoverRegion", props.workbenchServices);
    const hoveredZone = useSubscribedValue("global.hoverZone", props.workbenchServices);
    const hoveredFacies = useSubscribedValue("global.hoverFacies", props.workbenchServices);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);
    const showStatisticsTable = props.viewContext.useSettingsToViewInterfaceValue("showTable");
    const plotOptions = props.viewContext.useSettingsToViewInterfaceValue("plotOptions");
    const plotType = useAtomValue(plotTypeAtom);

    // Log status
    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);
    useMakeViewStatusWriterMessages(statusWriter);

    // Module title
    const firstResultName = useAtomValue(firstResultNameAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const title = firstResultName ? makeInplaceVolumesPlotTitle(firstResultName, subplotBy) : "";
    React.useEffect(() => {
        props.viewContext.setInstanceTitle(title);
    }, [title, props.viewContext]);

    const shouldShowPlot = plotType !== PlotType.NONE;
    const plotHeightFraction = showStatisticsTable && shouldShowPlot ? 0.7 : shouldShowPlot ? 1 : 0;

    const groupedData = useGroupedTableData(props.viewContext, ensembleSet, colorSet);
    const plotBuilder = usePlotBuilder(
        groupedData,
        plotOptions,
        hoveredRegion?.regionName ?? null,
        hoveredZone?.zoneName ?? null,
        hoveredFacies?.faciesName ?? null,
    );
    const tableBuilder = useTableBuilder(groupedData);

    usePublishToDataChannels(props.viewContext, ensembleSet, colorSet, groupedData);

    function createErrorMessage(): string | null {
        if (aggregatedTableDataQueries.allQueriesFailed) {
            return "Failed to load inplace volumes table data";
        }
        if (!areSelectedTablesComparable) {
            return "Selected inplace volumes tables are not comparable due to mismatching fluids, result names or index columns";
        }

        return null;
    }

    // If a user selects a single table first and initiates a fetch but then selects a set of tables that are not comparable,
    // we don't want to show that the module is pending, but rather immediately show the error message that the tables are not comparable.
    // The query is still fetching, but we don't want to show the pending state.
    const isPending = aggregatedTableDataQueries.isFetching && areSelectedTablesComparable;

    return (
        <div ref={divRef} className="w-full h-full relative flex flex-col">
            <PendingWrapper isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
                {shouldShowPlot && plotBuilder && (
                    <PlotSection
                        plotBuilder={plotBuilder}
                        height={divBoundingRect.height * plotHeightFraction}
                        width={divBoundingRect.width}
                        sharedXAxis={plotOptions.sharedXAxis}
                        sharedYAxis={plotOptions.sharedYAxis}
                    />
                )}
                {(showStatisticsTable || plotType === PlotType.NONE) && tableBuilder && (
                    <TableSection
                        tableBuilder={tableBuilder}
                        height={divBoundingRect.height * (1 - plotHeightFraction)}
                    />
                )}
            </PendingWrapper>
        </div>
    );
}

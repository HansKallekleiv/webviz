import React from "react";

import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { useVisualizationAssemblerProduct } from "@framework/dataProviderFramework/hooks/useVisualizationProduct";
import { makePlotVisualizationAssembler } from "@framework/dataProviderFramework/visualization/plotAssembler";
import { PlotViewWrapper } from "@framework/dataProviderFramework/visualization/PlotViewWrapper";
import type { ModuleViewProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";

import { ChannelIds } from "../channelDefs";
import type { Interfaces } from "../interfaces";

import { collectPlotGroups, makePlotChannelContents } from "./plotChannelContents";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const dataProviderManager = props.viewContext.useSettingsToViewInterfaceValue("dataProviderManager");
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const colorSet = useColorSet(props.workbenchSettings);
    const ensembleColors = React.useMemo(
        () =>
            Object.fromEntries(
                ensembleSet.getEnsembleArray().map((ensemble) => [ensemble.getIdent().toString(), ensemble.getColor()]),
            ),
        [ensembleSet],
    );
    const assembler = React.useMemo(
        () => makePlotVisualizationAssembler({ categoricalPalette: colorSet.getColorArray(), ensembleColors }),
        [colorSet, ensembleColors],
    );

    if (!dataProviderManager) return null;

    return <ChartViewContent {...props} dataProviderManager={dataProviderManager} assembler={assembler} />;
}

function ChartViewContent(
    props: ModuleViewProps<Interfaces> & {
        dataProviderManager: DataProviderManager;
        assembler: ReturnType<typeof makePlotVisualizationAssembler>;
    },
): React.ReactNode {
    const product = useVisualizationAssemblerProduct(props.dataProviderManager, props.assembler);
    const channelContents = React.useMemo(() => makePlotChannelContents(product), [product]);
    props.viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REALIZATION,
        dependencies: [product],
        enabled: channelContents.length > 0,
        contents: channelContents,
    });
    return (
        <PlotGroups
            root={product}
            hoverService={props.hoverService}
            moduleInstanceId={props.viewContext.getInstanceIdString()}
        />
    );
}

function PlotGroups(props: {
    root: Parameters<typeof collectPlotGroups>[0];
    hoverService: ModuleViewProps<Interfaces>["hoverService"];
    moduleInstanceId: string;
}): React.ReactNode {
    const groups = collectPlotGroups(props.root);
    const columnCount = Math.max(1, Math.ceil(Math.sqrt(groups.length)));
    return (
        <div
            className="grid h-full min-h-0 w-full gap-xs p-xs"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
            {groups.map((group) => (
                <div key={group.id} className="min-h-0 min-w-0">
                    <PlotViewWrapper
                        product={group.customProps}
                        hoverService={props.hoverService}
                        moduleInstanceId={props.moduleInstanceId}
                    />
                </div>
            ))}
        </div>
    );
}
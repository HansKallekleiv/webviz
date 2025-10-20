import { useAtomValue } from "jotai";

import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/DataChannelTypes";
import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { ChannelIds } from "@modules/InplaceVolumesPlot/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumesPlot/interfaces";

import { colorByAtom, firstResultNameAtom, subplotByAtom } from "../atoms/baseAtoms";
import { makeFormatLabelFunction } from "../utils/plotComponentUtils";
import type { InplaceVolumesTable } from "../utils/tableUtils";

import { useInplaceVolumesTable } from "./useInplaceVolumesTable";

function makeResultRealizationDataGenerator(
    displayName: string,
    ensembleIdent: RegularEnsembleIdent,
    table: InplaceVolumesTable,
    resultName: string,
    preferredColor?: string,
): DataGenerator {
    return () => {
        const realColumn = table.getColumn("REAL");
        const resultColumn = table.getColumn(resultName);

        if (!realColumn || !resultColumn) {
            throw new Error("REAL and result columns must be present");
        }

        const data: { key: number; value: number }[] = [];
        const realValues = realColumn.getAllRowValues();
        const resultValues = resultColumn.getAllRowValues();

        for (let row = 0; row < realValues.length; row++) {
            const realValue = realValues[row];
            const resultValue = resultValues[row];

            if (realValue === null || resultValue === null) {
                continue;
            }

            const key = parseFloat(realValue.toString());
            const value = parseFloat(resultValue.toString());
            data.push({ key, value });
        }

        const metaData: ChannelContentMetaData = {
            unit: "",
            ensembleIdentString: ensembleIdent.toString(),
            displayString: displayName,
            preferredColor: preferredColor,
        };

        return {
            data,
            metaData,
        };
    };
}

export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
) {
    const table = useInplaceVolumesTable();
    const colorBy = useAtomValue(colorByAtom);
    const resultName = useAtomValue(firstResultNameAtom);
    const subplotBy = useAtomValue(subplotByAtom);

    const contents: ChannelContentDefinition[] = [];

    // Check if we have required data
    const hasRequiredData = Boolean(
        table &&
            resultName &&
            table.getColumn("REAL") &&
            table.getColumn(resultName) &&
            table.getColumn(TableOriginKey.ENSEMBLE),
    );

    if (!hasRequiredData) {
        viewContext.usePublishChannelContents({
            channelIdString: ChannelIds.RESPONSE_PER_REAL,
            dependencies: [table, ensembleSet, resultName, colorBy, colorSet, subplotBy],
            enabled: false,
            contents: [],
        });
        return;
    }

    // Build grouping columns: subplot + color

    const groupingColumns = [...(subplotBy || []), colorBy].filter(Boolean);

    if (groupingColumns.length === 0) {
        viewContext.usePublishChannelContents({
            channelIdString: ChannelIds.RESPONSE_PER_REAL,
            dependencies: [table, ensembleSet, resultName, colorBy, colorSet, subplotBy],
            enabled: false,
            contents: [],
        });
        return;
    }

    const collection = table!.splitByColumns(groupingColumns);
    const tables = collection.getTables();
    const keys = collection.getKeys();

    const formatLabelFunction = makeFormatLabelFunction(ensembleSet);

    // Create color map for all groups
    const colorMap = createColorMapForGroups(table!, groupingColumns, colorBy, ensembleSet, colorSet);

    tables.forEach((groupTable, index) => {
        const key = keys[index];
        const keyStr = key.toString();
        const keyParts = keyStr.split("|");

        // Build display name from all grouping columns
        const labelParts = groupingColumns.map((colName, idx) => formatLabelFunction(colName, keyParts[idx] || key));
        const displayName = `${resultName} (${labelParts.join(", ")})`;

        // Get ensemble ident for this group
        const ensembleColumn = groupTable.getColumn(TableOriginKey.ENSEMBLE);
        if (!ensembleColumn) return;

        const ensembleValues = ensembleColumn.getAllRowValues();
        if (ensembleValues.length === 0) return;

        const ensembleIdentStr = ensembleValues[0]?.toString();
        if (!ensembleIdentStr) return;

        const ensembleIdent = RegularEnsembleIdent.fromString(ensembleIdentStr);

        // Get color for this group
        const preferredColor = colorMap.get(keyStr);

        const dataGenerator = makeResultRealizationDataGenerator(
            displayName,
            ensembleIdent,
            groupTable,
            resultName,
            preferredColor,
        );

        contents.push({
            contentIdString: keyStr,
            displayName,
            dataGenerator,
        });
    });

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REAL,
        dependencies: [ensembleSet, resultName, colorBy, colorSet, subplotBy],
        enabled: hasRequiredData,
        contents,
    });
}

/**
 * Create color map for all groups using the same logic as plots
 */
function createColorMapForGroups(
    table: InplaceVolumesTable,
    groupingColumns: string[],
    colorBy: string,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
): Map<string, string> {
    const colorMap = new Map<string, string>();

    // First, split by all grouping columns
    const collection = table.splitByColumns(groupingColumns);
    const allKeys = collection.getKeys();
    const allTables = collection.getTables();

    // Create a map of color values to colors
    const colorValueToColor = new Map<string, string>();
    const colorCollection = table.splitByColumn(colorBy);
    let currentColor = colorSet.getFirstColor();

    for (const [colorKey] of colorCollection.getCollectionMap()) {
        let effectiveColor = currentColor;

        // If coloring by ensemble, use ensemble-specific color
        if (colorBy === TableOriginKey.ENSEMBLE) {
            const ensembleIdent = RegularEnsembleIdent.fromString(colorKey.toString());
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                effectiveColor = ensemble.getColor();
            }
        }

        colorValueToColor.set(colorKey.toString(), effectiveColor);
        currentColor = colorSet.getNextColor();
    }

    //  assign colors to each group based on their color column value
    allTables.forEach((groupTable, index) => {
        const groupKey = allKeys[index];
        const groupKeyStr = groupKey.toString();

        // Get the color value for this group
        const colorColumn = groupTable.getColumn(colorBy);
        if (colorColumn) {
            const colorValues = colorColumn.getAllRowValues();
            if (colorValues.length > 0) {
                const colorValue = colorValues[0]?.toString();
                if (colorValue) {
                    const color = colorValueToColor.get(colorValue);
                    if (color) {
                        colorMap.set(groupKeyStr, color);
                    }
                }
            }
        }
    });

    return colorMap;
}

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Table } from "@modules/_shared/InplaceVolumes/Table";
import { ChannelIds } from "@modules/InplaceVolumesNew/channelDefs";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";
import { useAtomValue } from "jotai";

import { firstResultNameAtom } from "../atoms/baseAtoms";
import type { GroupedTableData } from "../utils/GroupedTableData";

/**
 * Publishes data to data channels for use by other modules.
 *
 * @param groupedData - GroupedTableData instance with all grouping and color info
 */
export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    groupedData: GroupedTableData | null,
) {
    const resultName = useAtomValue(firstResultNameAtom);

    const contents: ChannelContentDefinition[] = [];

    const table = groupedData?.getTable();
    const canPublish = groupedData && table && resultName && table.getColumn("REAL") && table.getColumn(resultName);

    if (canPublish) {
        for (const entry of groupedData.getAllEntries()) {
            const displayName = `${resultName} (${entry.subplotLabel}, ${entry.colorLabel})`;
            const contentIdString = `${entry.subplotKey}-${entry.colorKey}`;

            contents.push({
                contentIdString,
                displayName,
                dataGenerator: makeResultRealizationDataGenerator(entry.table, resultName, displayName, entry.color),
            });
        }
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REAL,
        dependencies: [groupedData, ensembleSet, resultName, colorSet],
        enabled: Boolean(canPublish),
        contents,
    });
}
function makeResultRealizationDataGenerator(
    table: Table,
    resultName: string,
    displayName: string,
    preferredColor?: string,
): DataGenerator {
    return () => {
        const realColumn = table.getColumn("REAL");
        const resultColumn = table.getColumn(resultName);
        const ensembleColumn = table.getColumn("ENSEMBLE");

        if (!realColumn || !resultColumn) {
            throw new Error("REAL and result columns must be present");
        }

        // Get the ensemble ident string (assuming single unique value per grouped table)
        let ensembleIdentString = "";
        if (ensembleColumn) {
            const uniqueValues = ensembleColumn.getUniqueValues();
            if (uniqueValues.length > 0) {
                ensembleIdentString = RegularEnsembleIdent.fromString(uniqueValues[0].toString()).toString();
            }
        }

        const data: { key: number; value: number }[] = [];
        for (let row = 0; row < realColumn.getNumRows(); row++) {
            const key = parseFloat(realColumn.getRowValue(row).toString());
            const value = parseFloat(resultColumn.getRowValue(row).toString());
            data.push({ key, value });
        }

        const metaData: ChannelContentMetaData = {
            unit: "",
            ensembleIdentString,
            displayString: displayName,
            preferredColor,
        };

        return { data, metaData };
    };
}

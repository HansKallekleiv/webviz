import type { EnsembleSet } from "@framework/EnsembleSet";
import type { ViewContext } from "@framework/ModuleContext";
import type { ColorSet } from "@lib/utils/ColorSet";
import { makeTableFromApiData } from "@modules/_shared/InplaceVolumes/tableUtils";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";
import type { InplaceVolumesPlotOptions } from "@modules/InplaceVolumesNew/typesAndEnums";
import { useAtomValue } from "jotai";

import { colorByAtom, firstResultNameAtom, subplotByAtom } from "../atoms/baseAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";
import { GroupedTableData } from "../utils/GroupedTableData";

/**
 * Creates a GroupedTableData instance from aggregated inplace volumes API data.
 *
 * This hook:
 * - Fetches aggregated inplace data and combines into a single table
 * - Groups the table by subplot and color-by columns
 * - Applies color assignments based on ensemble colors or ColorSet
 * - Optionally filters out constant (zero variance) data entries
 *
 * @param viewContext - Module view context for accessing settings
 * @param ensembleSet - Set of ensembles for color mapping and label formatting
 * @param colorSet - Color set for assigning colors to grouped entries
 * @returns GroupedTableData instance with all grouping and color info, or null if no data available
 */
export function useGroupedTableData(
    ensembleSet: EnsembleSet,
    colorSet: ColorSet,
    hideConstants: boolean,
): GroupedTableData | null {
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const firstResultName = useAtomValue(firstResultNameAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    const colorBy = useAtomValue(colorByAtom);

    if (aggregatedTableDataQueries.tablesData.length === 0 || !firstResultName) {
        return null;
    }

    const table = makeTableFromApiData(aggregatedTableDataQueries.tablesData);

    const groupedData = new GroupedTableData({
        table,
        subplotBy,
        colorBy,
        ensembleSet,
        colorSet,
    });

    // Filter out grouped entries where all values are constant (zero variance)
    if (hideConstants) {
        groupedData.filterConstantEntries(firstResultName);
    }

    return groupedData;
}

import React from "react";

import { useAtomValue } from "jotai";

import { firstResultNameAtom } from "../atoms/baseAtoms";
import type { GroupedTableData } from "../utils/GroupedTableData";
import { TableBuilder } from "../utils/TableBuilder";

/**
 * Creates a TableBuilder instance
 *
 * This hook:
 * - Creates data for the Table component based on grouped inplace table data
 *
 * @param groupedData - GroupedTableData instance with all grouping and color info
 * @returns TableBuilder instance or null if no data available
 */
export function useTableBuilder(groupedData: GroupedTableData | null): TableBuilder | null {
    const firstResultName = useAtomValue(firstResultNameAtom);

    return React.useMemo(() => {
        if (!groupedData || !firstResultName) return null;
        return new TableBuilder(groupedData, firstResultName);
    }, [groupedData, firstResultName]);
}

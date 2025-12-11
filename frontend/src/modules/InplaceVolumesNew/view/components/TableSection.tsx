import type React from "react";

import { Table as TableComponent } from "@lib/components/Table";

import type { TableBuilder } from "../utils/TableBuilder";

interface TableSectionProps {
    tableBuilder: TableBuilder;
    height: number;
}

export function TableSection({ tableBuilder, height }: TableSectionProps): React.ReactNode {
    return (
        <div style={{ height }}>
            <TableComponent
                columns={tableBuilder.buildColumns()}
                rows={tableBuilder.getRows()}
                rowIdentifier="id"
                height={height}
            />
        </div>
    );
}

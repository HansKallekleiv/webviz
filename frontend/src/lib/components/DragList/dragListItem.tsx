import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { DragIndicator } from "@mui/icons-material";

import { DragListContext, HoveredArea } from "./dragList";
import { DragListDropIndicator } from "./dragListDropIndicator";

export type DragListItemProps = {
    id: string;
    icon?: React.ReactNode;
    title: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    children: React.ReactNode;
};

export function DragListItem(props: DragListItemProps): React.ReactNode {
    const divRef = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(divRef);

    const dragListContext = React.useContext(DragListContext);

    const isHovered = dragListContext.hoveredElementId === props.id;
    const isDragging = dragListContext.draggedElementId === props.id;
    const dragPosition = dragListContext.dragPosition;

    return (
        <>
            {isHovered && dragListContext.hoveredArea === HoveredArea.TOP && <DragListDropIndicator />}
            <div
                className={resolveClassNames("drag-list-element drag-list-item flex flex-col relative")}
                data-item-id={props.id}
                ref={divRef}
            >
                <div
                    className={resolveClassNames("z-30 w-full h-full absolute left-0 top-0 bg-blue-500", {
                        hidden: !isDragging,
                    })}
                ></div>
                <Header {...props} />
                {isDragging &&
                    dragPosition &&
                    createPortal(
                        <div
                            className={resolveClassNames(
                                "flex h-10 px-1 bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50"
                            )}
                            style={{
                                left: dragPosition.x,
                                top: dragPosition.y,
                                width: isDragging ? boundingClientRect.width : undefined,
                            }}
                        >
                            <Header {...props} />
                        </div>
                    )}
                <div className="flex flex-col gap-2 bg-white border-b shadow-inner p-2">{props.children}</div>
            </div>
            {isHovered && dragListContext.hoveredArea === HoveredArea.BOTTOM && <DragListDropIndicator />}
        </>
    );
}

type HeaderProps = {
    icon?: React.ReactNode;
    title: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
};

function Header(props: HeaderProps): React.ReactNode {
    return (
        <div className="flex gap-1 h-8 bg-slate-100 hover:bg-blue-100 text-sm items-center border-b border-b-gray-300">
            <div className={resolveClassNames("drag-list-element-indicator px-0.5 hover:cursor-grab")}>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </div>
            <div className="flex items-center gap-2">
                {props.icon}
                <div className="flex-grow">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}

import React from "react";

import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vec2, point2Distance } from "@lib/utils/vec2";

import { isEqual } from "lodash";

import { DragListGroupProps } from "./dragListGroup";
import { DragListItemProps } from "./dragListItem";

export enum HoveredArea {
    TOP = "top",
    BOTTOM = "bottom",
    HEADER = "header",
    CENTER = "center",
}

export type DragListContextType = {
    draggedElementId: string | null;
    hoveredElementId: string | null;
    hoveredArea: HoveredArea | null;
    dragPosition: Vec2 | null;
};

export const DragListContext = React.createContext<DragListContextType>({
    draggedElementId: null,
    hoveredElementId: null,
    hoveredArea: null,
    dragPosition: null,
});

export type DragListProps = {
    contentWhenEmpty?: React.ReactNode;
    children: React.ReactElement<DragListItemProps | DragListGroupProps>[];
    onItemMove?: (itemId: string, originId: string | null, destinationId: string | null, position: number) => void;
};

function assertTargetIsDragListItemAndExtractProps(
    target: EventTarget | null
): { element: HTMLElement; id: string; parentId: string | null } | null {
    if (!target) {
        return null;
    }

    const element = target as HTMLElement;
    if (!element || !(element instanceof HTMLElement)) {
        return null;
    }

    const dragListItemIndicator = element.closest(".drag-list-element-indicator");
    if (!dragListItemIndicator) {
        return null;
    }

    const dragListElement = element.closest(".drag-list-element");
    if (!dragListElement) {
        return null;
    }

    if (!(dragListElement instanceof HTMLElement)) {
        return null;
    }

    const id = dragListElement.dataset.itemId;
    if (!id) {
        return null;
    }

    if (
        dragListElement.parentElement &&
        dragListElement.parentElement instanceof HTMLElement &&
        dragListElement.parentElement.classList.contains("drag-list-group")
    ) {
        const parentId = dragListElement.parentElement.dataset.itemId;
        if (parentId) {
            return { element: dragListElement, id, parentId };
        }
    }

    return { element: dragListElement, id, parentId: null };
}

enum ItemType {
    ITEM = "item",
    CONTAINER = "container",
}

type HoveredItemIdAndArea = {
    id: string;
    area: HoveredArea;
};

const ELEMENT_TOP_AND_CENTER_AREA_SIZE_IN_PX = 10;

export function DragList(props: DragListProps): React.ReactNode {
    const { onItemMove } = props;

    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [draggedItemId, setDraggedItemId] = React.useState<string | null>(null);
    const [hoveredItemIdAndArea, setHoveredItemIdAndArea] = React.useState<HoveredItemIdAndArea | null>(null);
    const [dragPosition, setDragPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [currentScrollPosition, setCurrentScrollPosition] = React.useState<number>(0);
    const [prevChildren, setPrevChildren] = React.useState<
        React.ReactElement<DragListItemProps | DragListGroupProps>[]
    >(props.children);

    const listDivRef = React.useRef<HTMLDivElement>(null);
    const scrollDivRef = React.useRef<HTMLDivElement>(null);
    const upperScrollDivRef = React.useRef<HTMLDivElement>(null);
    const lowerScrollDivRef = React.useRef<HTMLDivElement>(null);

    if (!isEqual(prevChildren, props.children)) {
        setPrevChildren(props.children);
        if (scrollDivRef.current) {
            scrollDivRef.current.scrollTop = currentScrollPosition;
        }
    }

    React.useEffect(
        function handleMount() {
            if (!listDivRef.current) {
                return;
            }

            const currentListDivRef = listDivRef.current;

            let pointerDownPosition: Vec2 | null = null;
            let pointerDownPositionRelativeToElement: Vec2 = { x: 0, y: 0 };
            let draggingActive: boolean = false;
            let draggedElement: {
                element: HTMLElement;
                id: string;
            } | null = null;

            let currentlyHoveredElement: {
                element: HTMLElement;
                id: string;
                area: HoveredArea;
            } | null = null;

            let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
            let doScroll: boolean = false;
            let currentScrollTime = 100;

            function handlePointerDown(e: PointerEvent) {
                const target = e.target;
                if (!target) {
                    return;
                }

                const dragListItemProps = assertTargetIsDragListItemAndExtractProps(target);
                if (!dragListItemProps) {
                    return;
                }

                const element = dragListItemProps.element;
                draggedElement = dragListItemProps;

                pointerDownPosition = { x: e.clientX, y: e.clientY };
                draggingActive = false;
                setIsDragging(true);

                pointerDownPositionRelativeToElement = {
                    x: e.clientX - element.getBoundingClientRect().left,
                    y: e.clientY - element.getBoundingClientRect().top,
                };
                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointerup", handlePointerUp);

                setIsDragging(true);
            }

            function maybeScroll(position: Vec2) {
                if (
                    upperScrollDivRef.current === null ||
                    lowerScrollDivRef.current === null ||
                    scrollDivRef.current === null
                ) {
                    return;
                }

                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                    currentScrollTime = 100;
                }

                if (rectContainsPoint(upperScrollDivRef.current.getBoundingClientRect(), position)) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                } else if (rectContainsPoint(lowerScrollDivRef.current.getBoundingClientRect(), position)) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                } else {
                    doScroll = false;
                }
            }

            function scrollUpRepeatedly() {
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollDivRef.current) {
                    scrollDivRef.current.scrollTop = Math.max(0, scrollDivRef.current.scrollTop - 10);
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                }
            }

            function scrollDownRepeatedly() {
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollDivRef.current) {
                    scrollDivRef.current.scrollTop = Math.min(
                        scrollDivRef.current.scrollHeight,
                        scrollDivRef.current.scrollTop + 10
                    );
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                }
            }

            function getDragElementsRecursively(parent?: HTMLElement): HTMLElement[] {
                const items: HTMLElement[] = [];
                const parentElement = parent ?? currentListDivRef;

                for (const child of parentElement.children) {
                    if (child instanceof HTMLElement && child.classList.contains("drag-list-item")) {
                        items.push(child);
                    }
                    if (child instanceof HTMLElement && child.classList.contains("drag-list-group")) {
                        items.push(child);
                        const content = child.querySelector(".drag-list-group-content");
                        if (content && content instanceof HTMLElement) {
                            items.push(...getDragElementsRecursively(content));
                        }
                    }
                }
                return items;
            }

            function getHoveredElement(e: PointerEvent): HTMLElement | null {
                const items = getDragElementsRecursively();
                for (const item of items) {
                    if (rectContainsPoint(item.getBoundingClientRect(), { x: e.clientX, y: e.clientY })) {
                        const type = getItemType(item);
                        if (type === ItemType.CONTAINER) {
                            const content = item.querySelector(".drag-list-group-content");
                            if (
                                content &&
                                rectContainsPoint(content.getBoundingClientRect(), { x: e.clientX, y: e.clientY })
                            ) {
                                continue;
                            }
                        }

                        return item;
                    }
                }

                return null;
            }

            function getItemType(item: HTMLElement): ItemType | null {
                if (item.classList.contains("drag-list-item")) {
                    return ItemType.ITEM;
                } else if (item.classList.contains("drag-list-group")) {
                    return ItemType.CONTAINER;
                }
                return null;
            }

            function getHoveredAreaOfItem(item: HTMLElement, e: PointerEvent): HoveredArea {
                const rect = item.getBoundingClientRect();
                const topAreaTop = rect.top;
                const topAreaBottom = rect.top + ELEMENT_TOP_AND_CENTER_AREA_SIZE_IN_PX;

                if (e.clientY >= topAreaTop && e.clientY <= topAreaBottom) {
                    return HoveredArea.TOP;
                }

                const bottomAreaTop = rect.bottom - ELEMENT_TOP_AND_CENTER_AREA_SIZE_IN_PX;
                const bottomAreaBottom = rect.bottom;

                if (e.clientY >= bottomAreaTop && e.clientY <= bottomAreaBottom) {
                    return HoveredArea.BOTTOM;
                }

                const headerElement = item.querySelector(".drag-list-item-header");
                if (!headerElement) {
                    return HoveredArea.CENTER;
                }

                const headerRect = headerElement.getBoundingClientRect();
                if (rectContainsPoint(headerRect, { x: e.clientX, y: e.clientY })) {
                    return HoveredArea.HEADER;
                }

                return HoveredArea.CENTER;
            }

            function getItemParentGroupId(item: HTMLElement): string | null {
                const group = item.parentElement?.closest(".drag-list-group");
                if (!group || !(group instanceof HTMLElement)) {
                    return null;
                }
                return group.dataset.itemId ?? null;
            }

            function getItemPositionInGroup(item: HTMLElement): number {
                let group = item.parentElement?.closest(".drag-list-group-content");
                if (!group || !(group instanceof HTMLElement)) {
                    group = currentListDivRef;
                }

                let pos = 0;
                for (let i = 0; i < group.children.length; i++) {
                    const elm = group.children[i];
                    if (!(elm instanceof HTMLElement) || getItemType(elm) === null) {
                        continue;
                    }
                    if (group.children[i] === item) {
                        return pos;
                    }
                    pos++;
                }

                throw new Error("Item not found in group");
            }

            function handlePointerMove(e: PointerEvent) {
                if (!pointerDownPosition || !draggedElement) {
                    return;
                }

                if (
                    !draggingActive &&
                    point2Distance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
                ) {
                    draggingActive = true;
                    setDraggedItemId(draggedElement.id);
                }

                if (!draggingActive) {
                    return;
                }

                const dx = e.clientX - pointerDownPositionRelativeToElement.x;
                const dy = e.clientY - pointerDownPositionRelativeToElement.y;
                setDragPosition({ x: dx, y: dy });

                const point: Vec2 = { x: e.clientX, y: e.clientY };

                maybeScroll(point);

                if (rectContainsPoint(draggedElement.element.getBoundingClientRect(), point)) {
                    // Hovering the dragged element itself
                    currentlyHoveredElement = null;
                    setHoveredItemIdAndArea(null);
                    return;
                }

                const hoveredElement = getHoveredElement(e);
                if (hoveredElement && hoveredElement instanceof HTMLElement) {
                    const area = getHoveredAreaOfItem(hoveredElement, e);
                    const itemType = getItemType(hoveredElement);
                    if (itemType === ItemType.ITEM && (area === HoveredArea.CENTER || area === HoveredArea.HEADER)) {
                        currentlyHoveredElement = null;
                        setHoveredItemIdAndArea(null);
                        return;
                    }
                    console.debug(hoveredElement, area);
                    setHoveredItemIdAndArea({ id: hoveredElement.dataset.itemId ?? "", area });
                    currentlyHoveredElement = {
                        element: hoveredElement,
                        id: hoveredElement.dataset.itemId ?? "",
                        area,
                    };
                } else {
                    currentlyHoveredElement = null;
                    setHoveredItemIdAndArea(null);
                }
            }

            function maybeCallItemMoveCallback() {
                if (!onItemMove) {
                    return;
                }

                if (!draggedElement || !currentlyHoveredElement) {
                    return;
                }

                if (currentlyHoveredElement.area === HoveredArea.CENTER) {
                    return;
                }

                if (currentlyHoveredElement.area === HoveredArea.HEADER) {
                    const originId = getItemParentGroupId(draggedElement.element);
                    const destinationId = currentlyHoveredElement.id;
                    const position = 0;
                    onItemMove(draggedElement.id, originId, destinationId, position);
                    return;
                }

                const originId = getItemParentGroupId(draggedElement.element);
                const destinationId = getItemParentGroupId(currentlyHoveredElement.element);
                const positionDelta = currentlyHoveredElement.area === HoveredArea.TOP ? 0 : 1;
                const position = getItemPositionInGroup(currentlyHoveredElement.element) + positionDelta;

                onItemMove(draggedElement.id, originId, destinationId, position);
            }

            function handlePointerUp() {
                maybeCallItemMoveCallback();
                cancelDragging();
            }

            function cancelDragging() {
                draggingActive = false;
                pointerDownPosition = null;
                draggedElement = null;
                currentlyHoveredElement = null;
                setIsDragging(false);
                setDraggedItemId(null);
                setHoveredItemIdAndArea(null);

                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
            }

            function handleKeyDown(e: KeyboardEvent) {
                if (e.key === "Escape") {
                    cancelDragging();
                }
            }

            function handleWindowBlur() {
                cancelDragging();
            }

            currentListDivRef.addEventListener("pointerdown", handlePointerDown);
            document.addEventListener("keydown", handleKeyDown);
            window.addEventListener("blur", handleWindowBlur);

            return function handleUnmount() {
                currentListDivRef.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("keydown", handleKeyDown);
                window.removeEventListener("blur", handleWindowBlur);
                setIsDragging(false);
                setDraggedItemId(null);
            };
        },
        [onItemMove, props.children]
    );

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        setCurrentScrollPosition(e.currentTarget.scrollTop);
    }

    function makeChildren(): React.ReactNode[] {
        const children: React.ReactNode[] = [];
        for (const child of props.children) {
            if (typeof child.type === "string") {
                continue;
            }
            if (child.type.name === "DragListItem") {
                children.push(
                    React.cloneElement(child, {
                        key: child.props.id,
                    })
                );
            } else {
                children.push(
                    React.cloneElement(child, {
                        key: child.props.id,
                    })
                );
            }
        }
        return children;
    }

    return (
        <div className="w-full h-full flex flex-col relative">
            <DragListContext.Provider
                value={{
                    draggedElementId: draggedItemId,
                    hoveredElementId: hoveredItemIdAndArea?.id ?? null,
                    hoveredArea: hoveredItemIdAndArea?.area ?? null,
                    dragPosition,
                }}
            >
                <div
                    className="absolute top-0 left-0 w-full h-5 z-50 pointer-events-none"
                    ref={upperScrollDivRef}
                ></div>
                <div
                    className="absolute left-0 bottom-0 w-full h-5 z-50 pointer-events-none"
                    ref={lowerScrollDivRef}
                ></div>
                <div
                    className="flex-grow overflow-auto min-h-0 bg-slate-200 relative"
                    ref={scrollDivRef}
                    onScroll={handleScroll}
                >
                    <div className="flex flex-col border border-slate-100 relative max-h-0" ref={listDivRef}>
                        {makeChildren()}
                    </div>
                </div>
                {isDragging &&
                    createPortal(
                        <div
                            className={resolveClassNames("absolute z-[100] inset-0", {
                                "cursor-not-allowed": !hoveredItemIdAndArea,
                                "cursor-grabbing": hoveredItemIdAndArea !== null,
                            })}
                        ></div>
                    )}
            </DragListContext.Provider>
        </div>
    );
}

import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { SortableListGroup } from "@lib/components/SortableList";
import { LayerGroup, LayerGroupTopic, useLayerGroupTopicValue } from "@modules/_shared/layers/LayerGroup";
import { LayerManager } from "@modules/_shared/layers/LayerManager";
import { Add, Delete, Folder, Visibility, VisibilityOff } from "@mui/icons-material";

import { AddLayerDropdown } from "./addLayerDropdown";
import { LayerFactory, MakeSettingsContainerFunc } from "./layersPanel";
import { makeContent } from "./utils";

export type LayerGroupComponentProps<TLayerType extends string> = {
    layerManager: LayerManager;
    group: LayerGroup;
    icon?: React.ReactNode;
    layerFactory: LayerFactory<TLayerType>;
    layerTypeToStringMapping: Record<string, string>;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    makeSettingsContainerFunc: MakeSettingsContainerFunc;
    onRemove: (groupId: string) => void;
};

export function LayerGroupComponent<TLayerType extends string>(
    props: LayerGroupComponentProps<TLayerType>
): React.ReactNode {
    useLayerGroupTopicValue(props.group, LayerGroupTopic.ITEMS_CHANGED);

    const items = props.group.getItems();

    function handleRemoveItem(layerId: string) {
        props.group.removeItem(layerId);
    }

    return (
        <SortableListGroup
            key={props.group.getId()}
            id={props.group.getId()}
            title={<LayerGroupName group={props.group} />}
            startAdornment={
                <LayerGroupStartAdornment group={props.group} icon={props.icon ?? <Folder fontSize="inherit" />} />
            }
            endAdornment={
                <LayerGroundEndAdornment
                    layerManager={props.layerManager}
                    group={props.group}
                    onRemove={props.onRemove}
                    layerFactory={props.layerFactory}
                    layerTypeToStringMapping={props.layerTypeToStringMapping}
                />
            }
            contentWhenEmpty={
                <div className="flex h-16 justify-center text-sm items-center gap-1">
                    Click on <Add fontSize="inherit" /> to add a layer or drag a layer in.
                </div>
            }
        >
            {makeContent(
                items,
                props.layerManager,
                props.icon,
                props.layerFactory,
                props.layerTypeToStringMapping,
                handleRemoveItem,
                props.makeSettingsContainerFunc,
                props.ensembleSet,
                props.workbenchSession,
                props.workbenchSettings
            )}
        </SortableListGroup>
    );
}

export type LayerGroupStartAdornmentProps = {
    group: LayerGroup;
    icon: React.ReactNode;
};

export function LayerGroupStartAdornment(props: LayerGroupStartAdornmentProps): React.ReactNode {
    const isVisible = useLayerGroupTopicValue(props.group, LayerGroupTopic.VISIBILITY_CHANGED);

    function handleToggleLayerVisibility() {
        props.group.setIsVisible(!isVisible);
    }

    return (
        <>
            <div
                className="px-0.5 hover:cursor-pointer rounded hover:text-blue-800"
                onClick={handleToggleLayerVisibility}
                title="Toggle visibility"
            >
                {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
            </div>
            {props.icon}
        </>
    );
}

export type LayerGroundEndAdornmentProps<TLayerType extends string> = {
    layerManager: LayerManager;
    group: LayerGroup;
    layerTypeToStringMapping: Record<string, string>;
    layerFactory: LayerFactory<TLayerType>;
    onRemove: (groupId: string) => void;
};

export function LayerGroundEndAdornment<TLayerType extends string>(
    props: LayerGroundEndAdornmentProps<TLayerType>
): React.ReactNode {
    function handleRemoveLayerGroup() {
        props.onRemove(props.group.getId());
    }

    return (
        <>
            <AddLayerDropdown
                layerManager={props.layerManager}
                parent={props.group}
                layerFactory={props.layerFactory}
                layerTypeToStringMapping={props.layerTypeToStringMapping}
            />
            <div
                className="hover:cursor-pointer rounded hover:text-red-800"
                onClick={handleRemoveLayerGroup}
                title="Remove layer group"
            >
                <Delete fontSize="inherit" />
            </div>
        </>
    );
}

type LayerNameProps = {
    group: LayerGroup;
};

export function LayerGroupName(props: LayerNameProps): React.ReactNode {
    const groupName = useLayerGroupTopicValue(props.group, LayerGroupTopic.NAME_CHANGED);
    const [editingName, setEditingName] = React.useState<boolean>(false);

    function handleNameDoubleClick() {
        setEditingName(true);
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.group.setName(e.target.value);
    }

    function handleBlur() {
        setEditingName(false);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            setEditingName(false);
        }
    }

    return (
        <div
            className="flex-grow font-bold flex items-center pt-1"
            onDoubleClick={handleNameDoubleClick}
            title="Double-click to edit name"
        >
            {editingName ? (
                <input
                    type="text"
                    className="p-0.5 w-full"
                    value={groupName}
                    onChange={handleNameChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                groupName
            )}
        </div>
    );
}
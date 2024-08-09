import React from "react";

import { QueryClient } from "@tanstack/query-core";

import { BaseLayer } from "./BaseLayer";
import { LayerGroup } from "./LayerGroup";

export enum LayerManagerTopic {
    ITEMS_CHANGED = "items-changed",
}

export type LayerManagerTopicValueTypes = {
    [LayerManagerTopic.ITEMS_CHANGED]: BaseLayer<any, any>[];
};

export type LayerManagerItem = BaseLayer<any, any> | LayerGroup;

export class LayerManager {
    private _queryClient: QueryClient | null = null;
    private _layersGroupMap: Map<string, string> = new Map();
    private _subscribers: Map<LayerManagerTopic, Set<() => void>> = new Map();
    private _items: LayerManagerItem[] = [];

    setQueryClient(queryClient: QueryClient): void {
        this._queryClient = queryClient;
    }

    getQueryClient(): QueryClient {
        if (!this._queryClient) {
            throw new Error("Query client not set");
        }
        return this._queryClient;
    }

    addLayer(layer: BaseLayer<any, any>): void {
        if (!this._queryClient) {
            throw new Error("Query client not set");
        }
        layer.setName(this.makeUniqueLayerName(layer.getName()));
        layer.setQueryClient(this._queryClient);
        this._items = [layer, ...this._items];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    addLayerToGroup(layer: BaseLayer<any, any>, groupId: string): void {
        if (!this._queryClient) {
            throw new Error("Query client not set");
        }
        layer.setName(this.makeUniqueLayerName(layer.getName()));
        layer.setQueryClient(this._queryClient);
        const groupIndex = this._items.findIndex((item) => item.getId() === groupId);
        if (groupIndex === -1) {
            throw new Error("Group not found");
        }
        this._items = [...this._items.slice(0, groupIndex + 1), layer, ...this._items.slice(groupIndex + 1)];
        this._layersGroupMap.set(layer.getId(), groupId);
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    addGroup(name: string): void {
        const uniqueName = this.makeUniqueGroupName(name);
        const group = new LayerGroup(uniqueName);
        this._items = [group, ...this._items];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    removeLayer(id: string): void {
        this._items = this._items.filter((item) => item.getId() !== id);
        this._layersGroupMap.delete(id);
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    removeGroup(id: string): void {
        const layerIdsInGroup: string[] = [];
        for (const [layerId, groupId] of this._layersGroupMap) {
            if (groupId === id) {
                this._layersGroupMap.delete(layerId);
                layerIdsInGroup.push(layerId);
            }
        }
        this._items = this._items.filter((item) => item.getId() !== id && !layerIdsInGroup.includes(item.getId()));
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    getLayerGroupId(layerId: string): string | undefined {
        return this._layersGroupMap.get(layerId);
    }

    getGroupOfLayer(layerId: string): LayerGroup | undefined {
        const groupId = this.getLayerGroupId(layerId);
        if (!groupId) {
            return undefined;
        }
        return this.getGroup(groupId);
    }

    setLayerGroupId(layerId: string, groupId: string | undefined): void {
        if (groupId) {
            this._layersGroupMap.set(layerId, groupId);
        } else {
            this._layersGroupMap.delete(layerId);
        }
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    getItem(id: string): LayerManagerItem | undefined {
        return this._items.find((item) => item.getId() === id);
    }

    getLayer(id: string): BaseLayer<any, any> | undefined {
        const item = this.getItem(id);
        if (item instanceof BaseLayer) {
            return item;
        }
        return undefined;
    }

    getLayersInGroup(groupId: string): BaseLayer<any, any>[] {
        return this._items.filter((item) => this.getLayerGroupId(item.getId()) === groupId) as BaseLayer<any, any>[];
    }

    getGroup(id: string): LayerGroup | undefined {
        const item = this.getItem(id);
        if (item instanceof LayerGroup) {
            return item;
        }
        return undefined;
    }

    getItems(): LayerManagerItem[] {
        return this._items;
    }

    changeOrder(order: string[]): void {
        this._items = order.map((id) => this._items.find((item) => item.getId() === id)).filter(Boolean) as BaseLayer<
            any,
            any
        >[];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    subscribe(topic: LayerManagerTopic, subscriber: () => void): void {
        const subscribers = this._subscribers.get(topic) ?? new Set();
        subscribers.add(subscriber);
        this._subscribers.set(topic, subscribers);
    }

    private notifySubscribers(topic: LayerManagerTopic): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber());
        }
    }

    private getAllLayers(): BaseLayer<any, any>[] {
        return this._items.filter((item) => item instanceof BaseLayer) as BaseLayer<any, any>[];
    }

    private getAllGroups(): LayerGroup[] {
        return this._items.filter((item) => item instanceof LayerGroup) as LayerGroup[];
    }

    makeUniqueLayerName(name: string): string {
        let potentialName = name;
        let i = 1;
        const allLayers = this.getAllLayers();
        while (allLayers.some((layer) => layer.getName() === potentialName)) {
            potentialName = `${name} (${i})`;
            i++;
        }
        return potentialName;
    }

    private makeUniqueGroupName(name: string): string {
        let potentialName = name;
        let i = 1;
        const allGroups = this.getAllGroups();
        while (allGroups.some((group) => group.getName() === potentialName)) {
            potentialName = `${name} (${i})`;
            i++;
        }
        return potentialName;
    }

    makeSubscriberFunction(topic: LayerManagerTopic): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const subscriber = (onStoreChangeCallback: () => void): (() => void) => {
            const subscribers = this._subscribers.get(topic) || new Set();
            subscribers.add(onStoreChangeCallback);
            this._subscribers.set(topic, subscribers);

            return () => {
                subscribers.delete(onStoreChangeCallback);
            };
        };

        return subscriber;
    }

    makeSnapshotGetter<T extends LayerManagerTopic>(topic: T): () => LayerManagerTopicValueTypes[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerManagerTopic.ITEMS_CHANGED) {
                return this.getItems();
            }
        };

        return snapshotGetter;
    }
}

export function useLayerManagerTopicValue<T extends LayerManagerTopic>(
    layerManager: LayerManager,
    topic: T
): LayerManagerTopicValueTypes[T] {
    const value = React.useSyncExternalStore<LayerManagerTopicValueTypes[T]>(
        layerManager.makeSubscriberFunction(topic),
        layerManager.makeSnapshotGetter(topic)
    );

    return value;
}

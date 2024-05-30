import React from "react";

import { QueryClient } from "@tanstack/query-core";

import { cloneDeep, isEqual } from "lodash";
import { v4 } from "uuid";

export enum LayerStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
}

export enum LayerTopic {
    NAME = "NAME",
    SETTINGS = "SETTINGS",
    DATA = "DATA",
    STATUS = "STATUS",
    VISIBILITY = "VISIBILITY",
}

export type BoundingBox = {
    x: [number, number];
    y: [number, number];
    z: [number, number];
};

export type LayerSettings = {
    [key: string]: any;
};

export class BaseLayer<TSettings extends LayerSettings, TData> {
    private _subscribers: Map<LayerTopic, Set<() => void>> = new Map();
    protected _queryClient: QueryClient;
    protected _status: LayerStatus = LayerStatus.IDLE;
    private _id: string;
    private _name: string;
    private _isVisible: boolean = true;
    private _boundingBox: BoundingBox | null = null;
    protected _data: TData | null = null;
    protected _settings: TSettings = {} as TSettings;

    constructor(name: string, settings: TSettings, queryClient: QueryClient) {
        this._id = v4();
        this._name = name;
        this._settings = settings;
        this._queryClient = queryClient;
    }

    getId(): string {
        return this._id;
    }

    getSettings(): TSettings {
        return this._settings;
    }

    getStatus(): LayerStatus {
        return this._status;
    }

    getName(): string {
        return this._name;
    }

    setName(name: string): void {
        this._name = name;
        this.notifySubscribers(LayerTopic.NAME);
    }

    getBoundingBox(): BoundingBox | null {
        return this._boundingBox;
    }

    setBoundingBox(boundingBox: BoundingBox | null): void {
        this._boundingBox = boundingBox;
    }

    getIsVisible(): boolean {
        return this._isVisible;
    }

    setIsVisible(isVisible: boolean): void {
        this._isVisible = isVisible;
        this.notifySubscribers(LayerTopic.VISIBILITY);
    }

    getData(): TData | null {
        return this._data;
    }

    maybeUpdateSettings(updatedSettings: Partial<TSettings>): void {
        const patchesToApply: Partial<TSettings> = {};
        for (const setting in updatedSettings) {
            if (!(setting in this._settings)) {
                throw new Error(`Setting "${setting}" is not valid for this layer`);
            }

            if (!isEqual(this._settings[setting], updatedSettings[setting])) {
                patchesToApply[setting] = updatedSettings[setting];
            }
        }
        if (Object.keys(patchesToApply).length > 0) {
            const prevSettings = { ...this._settings };
            this._settings = { ...this._settings, ...patchesToApply };

            if (this.doSettingsChangesRequireDataRefetch(prevSettings, this._settings)) {
                this.maybeRefetchData();
            }
        }
        this.notifySubscribers(LayerTopic.SETTINGS);
    }

    subscribe(topic: LayerTopic, callback: () => void): () => void {
        if (!this._subscribers.has(topic)) {
            this._subscribers.set(topic, new Set());
        }
        this._subscribers.get(topic)?.add(callback);

        return () => {
            this.unsubscribe(topic, callback);
        };
    }

    unsubscribe(topic: LayerTopic, callback: () => void): void {
        this._subscribers.get(topic)?.delete(callback);
    }

    protected notifySubscribers(topic: LayerTopic): void {
        for (const callback of this._subscribers.get(topic) ?? []) {
            callback();
        }
    }

    protected areSettingsValid(): boolean {
        return true;
    }

    protected doSettingsChangesRequireDataRefetch(prevSettings: TSettings, newSettings: TSettings): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    private async maybeRefetchData(): Promise<void> {
        if (!this.areSettingsValid()) {
            return;
        }
        this._status = LayerStatus.LOADING;
        this.notifySubscribers(LayerTopic.STATUS);
        try {
            this._data = await this.fetchData();
            this.notifySubscribers(LayerTopic.DATA);
            this._status = LayerStatus.SUCCESS;
        } catch (error) {
            console.error("Error fetching GridLayer data", error);
            this._status = LayerStatus.ERROR;
        }
        this.notifySubscribers(LayerTopic.STATUS);
    }

    protected async fetchData(): Promise<TData> {
        throw new Error("Not implemented");
    }
}

export function useLayerStatus(layer: BaseLayer<any, any>): LayerStatus {
    const [status, setStatus] = React.useState<LayerStatus>(layer.getStatus());

    React.useEffect(
        function handleHookMount() {
            function handleStatusChange() {
                setStatus(layer.getStatus());
            }

            const unsubscribe = layer.subscribe(LayerTopic.STATUS, handleStatusChange);

            return unsubscribe;
        },
        [layer]
    );

    return status;
}

export function useIsLayerVisible(layer: BaseLayer<any, any>): boolean {
    const [isVisible, setIsVisible] = React.useState<boolean>(layer.getIsVisible());

    React.useEffect(
        function handleHookMount() {
            function handleVisibilityChange() {
                setIsVisible(layer.getIsVisible());
            }

            const unsubscribe = layer.subscribe(LayerTopic.VISIBILITY, handleVisibilityChange);

            return unsubscribe;
        },
        [layer]
    );

    return isVisible;
}

export function useLayerSettings<T extends LayerSettings>(layer: BaseLayer<T, any>): T {
    const [settings, setSettings] = React.useState<T>(layer.getSettings());

    React.useEffect(
        function handleHookMount() {
            function handleSettingsChange() {
                setSettings(cloneDeep(layer.getSettings()));
            }

            const unsubscribe = layer.subscribe(LayerTopic.SETTINGS, handleSettingsChange);

            return unsubscribe;
        },
        [layer]
    );

    return settings;
}

export function useLayers(layers: BaseLayer<any, any>[]): BaseLayer<any, any>[] {
    const [adjustedLayers, setAdjustedLayers] = React.useState<BaseLayer<any, any>[]>(layers);

    React.useEffect(
        function handleHookMount() {
            function handleLayerChange() {
                setAdjustedLayers([...layers]);
            }

            handleLayerChange();

            const unsubscribeFuncs: (() => void)[] = [];
            for (const layer of layers) {
                const unsubscribeData = layer.subscribe(LayerTopic.DATA, handleLayerChange);
                const unsubscribeVisibility = layer.subscribe(LayerTopic.VISIBILITY, handleLayerChange);
                const unsubscribeSettings = layer.subscribe(LayerTopic.SETTINGS, handleLayerChange);
                unsubscribeFuncs.push(unsubscribeData, unsubscribeVisibility, unsubscribeSettings);
            }

            return () => {
                for (const unsubscribe of unsubscribeFuncs) {
                    unsubscribe();
                }
            };
        },
        [layers]
    );

    return adjustedLayers;
}

export type LayerStatuses = { id: string; status: LayerStatus }[];

export function useLayersStatuses(layers: BaseLayer<any, any>[]): { id: string; status: LayerStatus }[] {
    const [layersStatuses, setLayersStatuses] = React.useState<{ id: string; status: LayerStatus }[]>(
        layers.map((layer) => ({ id: layer.getId(), status: layer.getStatus() }))
    );

    React.useEffect(
        function handleHookMount() {
            function handleLayersStatusChange() {
                setLayersStatuses(layers.map((layer) => ({ id: layer.getId(), status: layer.getStatus() })));
            }

            handleLayersStatusChange();

            const unsubscribeFuncs: (() => void)[] = [];
            for (const layer of layers) {
                const unsubscribeFunc = layer.subscribe(LayerTopic.STATUS, handleLayersStatusChange);
                unsubscribeFuncs.push(unsubscribeFunc);
            }

            return () => {
                for (const unsubscribe of unsubscribeFuncs) {
                    unsubscribe();
                }
            };
        },
        [layers]
    );

    return layersStatuses;
}
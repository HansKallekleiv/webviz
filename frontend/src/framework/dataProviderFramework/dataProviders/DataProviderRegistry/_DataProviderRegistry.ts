import { DataProvider } from "../../framework/DataProvider/DataProvider";
import type { DataProviderManager } from "../../framework/DataProviderManager/DataProviderManager";
import type { CustomDataProviderImplementation } from "../../interfacesAndTypes/customDataProviderImplementation";
import type { VisualizationKind } from "../visualizationKinds";

export class DataProviderRegistry {
    private static _compatibleVisualizationKinds: Map<string, readonly VisualizationKind[] | undefined> = new Map();
    private static _registeredDataProviders: Map<
        string,
        {
            customDataProviderImplementation: {
                new (customParams?: any): CustomDataProviderImplementation<any, any, any, any, any, any>;
            };
            customDataProviderImplementationConstructorParams?: any;
        }
    > = new Map();

    static registerDataProvider<
        TDataProvider extends {
            new (...params: any[]): CustomDataProviderImplementation<any, any, any, any, any, any>;
        },
    >(
        type: string,
        customDataProviderImplementation: TDataProvider,
        customDataProviderImplementationConstructorParams?: ConstructorParameters<TDataProvider>,
    ): void {
        if (this._registeredDataProviders.has(type)) {
            throw new Error(`Data provider '${type}' already registered`);
        }
        this._registeredDataProviders.set(type, {
            customDataProviderImplementation,
            customDataProviderImplementationConstructorParams,
        });
    }

    static makeDataProvider(
        type: string,
        dataProviderManager: DataProviderManager,
        instanceName?: string,
    ): DataProvider<any, any, any, any> {
        return new DataProvider({
            instanceName,
            dataProviderManager,
            customDataProviderImplementation: this.makeCustomDataProviderImplementation(type),
            type,
        });
    }

    static getCompatibleVisualizationKinds(type: string): readonly VisualizationKind[] | undefined {
        if (!this._compatibleVisualizationKinds.has(type)) {
            // Implementations only initialise fields in their constructors, so a throwaway instance is side-effect free
            const kinds = this.makeCustomDataProviderImplementation(type).compatibleVisualizationKinds;
            this._compatibleVisualizationKinds.set(type, kinds);
        }
        return this._compatibleVisualizationKinds.get(type);
    }

    private static makeCustomDataProviderImplementation(
        type: string,
    ): CustomDataProviderImplementation<any, any, any, any, any, any> {
        const stored = this._registeredDataProviders.get(type);
        if (!stored) {
            throw new Error(`Data provider '${type}' not found`);
        }
        return new stored.customDataProviderImplementation(
            ...(stored.customDataProviderImplementationConstructorParams ?? []),
        );
    }
}

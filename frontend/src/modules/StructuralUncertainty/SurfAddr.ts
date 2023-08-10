import { SurfaceStatisticFunction_api } from "@api";

export interface RealizationsSurfAddr {
    addressType: "realization";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    realizations: number[];
}

export interface StatisticalSurfAddr {
    addressType: "statistical";
    caseUuid: string;
    ensemble: string;
    name: string;
    attribute: string;
    realizations:number[];
    statisticFunction: SurfaceStatisticFunction_api;
}


export type SurfAddr = RealizationsSurfAddr | StatisticalSurfAddr

export function makeSurfAddrString(addr: SurfAddr): string {
    const valueArr = Object.values(addr);
    const str = valueArr.join("--");
    return str;
}

export class SurfAddrFactory {
    private _caseUuid: string;
    private _ensemble: string;
    private _name: string;
    private _attribute: string;

    constructor(caseUuid: string, ensemble: string, name: string, attribute: string) {
        this._caseUuid = caseUuid;
        this._ensemble = ensemble;
        this._name = name;
        this._attribute = attribute;
    }

    createRealizationAddr(realizations: number[]): RealizationsSurfAddr {
        return {
            addressType: "realization",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            realizations: realizations,
        };
    }


    CreateStatisticalSurfAddr(statFunction: SurfaceStatisticFunction_api,realizations:number[]): StatisticalSurfAddr {
        return {
            addressType: "statistical",
            caseUuid: this._caseUuid,
            ensemble: this._ensemble,
            name: this._name,
            attribute: this._attribute,
            realizations: realizations,
            statisticFunction: statFunction,
        };
    }
}

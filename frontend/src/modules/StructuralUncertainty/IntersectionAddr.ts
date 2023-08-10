
export interface WellIntersectionAddr {
    addressType: "well";
    well_uuid:string;
    // caseUuid: string;
    // ensemble: string;
    // name: string;
    // attribute: string;
    // realizations: number[];
}

export interface PolyLineIntersectionAddr {
    addressType: "polyline";
    xy_array: number[][];
    
}

export type IntersectionAddr = WellIntersectionAddr | PolyLineIntersectionAddr

export class IntersectionAddrFactory {
    // private _caseUuid: string;
    // private _ensemble: string;
    // private _name: string;
    // private _attribute: string;

    // constructor(caseUuid: string, ensemble: string, name: string, attribute: string) {
    //     this._caseUuid = caseUuid;
    //     this._ensemble = ensemble;
    //     this._name = name;
    //     this._attribute = attribute;
    // }

    createWellIntersectionAddr(well_uuid: string): WellIntersectionAddr {
        return {
            addressType: "well",
            well_uuid: well_uuid

        };
    }


    createPolyLineIntersectionAddr(xy_array: number[][]): PolyLineIntersectionAddr {
        return {
            addressType: "polyline",
            xy_array: xy_array
        };
    }
}

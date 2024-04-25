import { InplaceVolumetricData_api, InplaceVolumetricsTableDefinition_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolTableInfoCollection = {
    ensembleIdent: EnsembleIdent;
    tableInfos: InplaceVolumetricsTableDefinition_api[];
};

export type CombinedInplaceVolTableInfoResults = {
    tableInfoCollections: InplaceVolTableInfoCollection[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
    errors: (Error | null)[];
};

export enum PlotGroupingEnum {
    ENSEMBLE = "Ensemble",
    ZONE = "ZONE",
    REGION = "REGION",
    FACIES = "FACIES",
}

export type InplaceVolDataEnsembleSet = {
    ensembleIdentString: string;
    responseSetData: InplaceVolDataResultSet[];
};
export type InplaceVolDataResultSet = {
    responseName: string;
    data: InplaceVolumetricData_api | null;
};
export type CombinedInplaceVolDataEnsembleSetResults = {
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
    ensembleSetData: InplaceVolDataEnsembleSet[];
};

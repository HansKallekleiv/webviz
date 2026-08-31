import type { Frequency_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export enum DataKind {
    SUMMARY_VECTOR = "summary-vector",
    INPLACE_VOLUMES = "inplace-volumes",
}

export enum SummaryVectorRepresentation {
    REALIZATIONS = "realizations",
    STATISTICS = "statistics",
    FANCHART = "fanchart",
}

export type SummaryVectorAddress = {
    kind: DataKind.SUMMARY_VECTOR;
    ensemble: RegularEnsembleIdent | DeltaEnsembleIdent;
    vectorName: string;
    frequency: Frequency_api | null;
    representation: SummaryVectorRepresentation;
};

export type InplaceVolumesAddress = {
    kind: DataKind.INPLACE_VOLUMES;
    ensemble: RegularEnsembleIdent;
    gridName: string;
    resultName: string;
    filters: {
        zone: readonly string[];
        region: readonly string[];
        facies: readonly string[];
        license: readonly string[];
    };
};

export type DataAddress = SummaryVectorAddress | InplaceVolumesAddress;
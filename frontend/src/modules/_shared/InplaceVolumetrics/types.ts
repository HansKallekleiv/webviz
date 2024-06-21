import { InplaceVolumetricsTableDefinition_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolumetricsInfoWithEnsembleIdent = InplaceVolumetricsTableDefinition_api & {
    ensembleIdent: EnsembleIdent;
};

export enum FluidZoneTypeEnum {
    OIL = "Oil",
    GAS = "Gas",
    WATER = "Water",
}

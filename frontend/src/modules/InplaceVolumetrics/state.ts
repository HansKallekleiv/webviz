import { InplaceVolumetricsCategoryValues_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolumetricsDataSpec = {
    ensembleIdent: EnsembleIdent;
    tableName: string;
    responseName: string;
    categoricalFilter: InplaceVolumetricsCategoryValues_api[];
    realizationsToInclude: number[];
};
export interface State {
    ensembleIdent: EnsembleIdent | null;
    tableName: string | null;
    responseName: string | null;
    categoricalOptions: InplaceVolumetricsCategoryValues_api[] | null;
    categoricalFilter: InplaceVolumetricsCategoryValues_api[] | null;
    realizationsToInclude: number[] | null;
}

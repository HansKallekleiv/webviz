import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";

export type EnsembleKind = "regular" | "delta";
export type EnsembleIdent = RegularEnsembleIdent | DeltaEnsembleIdent;

export const DEFAULT_SUPPORTED_ENSEMBLE_KINDS: readonly EnsembleKind[] = ["regular"];

export function filterEnsembleIdentsBySupportedKinds<T extends EnsembleIdent>(
    ensembleIdents: readonly T[],
    supportedKinds: readonly EnsembleKind[],
): T[] {
    return ensembleIdents.filter((ensembleIdent) =>
        isEnsembleIdentOfType(ensembleIdent, DeltaEnsembleIdent)
            ? supportedKinds.includes("delta")
            : supportedKinds.includes("regular"),
    );
}
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export function makeDistinguishableEnsembleDisplayName(ensembleIdent: EnsembleIdent, allEnsembles: Ensemble[]): string {
    const ensembleNameCount = allEnsembles.filter(
        (ensemble) => ensemble.getEnsembleName() === ensembleIdent.getEnsembleName()
    ).length;
    if (ensembleNameCount === 1) {
        return ensembleIdent.getEnsembleName();
    }

    const ensemble = allEnsembles.find((ensemble) => ensemble.getIdent().equals(ensembleIdent));
    if (!ensemble) {
        return ensembleIdent.getEnsembleName();
    }

    return ensemble.getDisplayName();
}

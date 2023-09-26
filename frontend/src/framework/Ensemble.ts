import { EnsembleIdent } from "./EnsembleIdent";
import { EnsembleParameters, Parameter } from "./EnsembleParameters";
import { EnsembleSensitivities, Sensitivity } from "./EnsembleSensitivities";

export class Ensemble {
    private _ensembleIdent: EnsembleIdent;
    private _caseName: string;
    private _realizationsArr: number[];
    private _parameters: EnsembleParameters;
    private _sensitivities: EnsembleSensitivities | null;

    constructor(
        caseUuid: string,
        caseName: string,
        ensembleName: string,
        realizationsArr: number[],
        parameterArr: Parameter[],
        sensitivityArr: Sensitivity[] | null
    ) {
        this._ensembleIdent = new EnsembleIdent(caseUuid, ensembleName);
        this._caseName = caseName;
        this._realizationsArr = Array.from(realizationsArr).sort((a, b) => a - b);
        this._parameters = new EnsembleParameters(parameterArr);

        this._sensitivities = null;
        if (sensitivityArr && sensitivityArr.length > 0) {
            this._sensitivities = new EnsembleSensitivities(sensitivityArr);
        }
    }

    getIdent(): EnsembleIdent {
        return this._ensembleIdent;
    }

    getDisplayName(): string {
        return `${this._ensembleIdent.getEnsembleName()} (${this._caseName})`;
    }

    getCaseUuid(): string {
        return this._ensembleIdent.getCaseUuid();
    }

    getEnsembleName(): string {
        return this._ensembleIdent.getEnsembleName();
    }

    getCaseName(): string {
        return this._caseName;
    }

    getRealizations(): readonly number[] {
        return this._realizationsArr;
    }

    getRealizationCount(): number {
        return this._realizationsArr.length;
    }

    getMaxRealizationNumber(): number | undefined {
        if (this._realizationsArr.length == 0) {
            return undefined;
        }

        return this._realizationsArr[this._realizationsArr.length - 1];
    }

    getParameters(): EnsembleParameters {
        return this._parameters;
    }

    getSensitivities(): EnsembleSensitivities | null {
        return this._sensitivities;
    }
}

export const SYNTH = {
    assetName: "Synthetic",
    fieldIdentifier: "SYNTH",
    caseName: "synthetic_case_v1",
    caseUuid: "5e7e7e7e-0000-4000-8000-000000000001",
    ensembleName: "iter-0",
    realizations: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    userName: "synthetic.user",
    updatedAtUtcMs: Date.UTC(2022, 11, 1),
} as const;

export function isSynthEnsemble(caseUuid: string | null | undefined, ensembleName: string | null | undefined): boolean {
    return caseUuid === SYNTH.caseUuid && ensembleName === SYNTH.ensembleName;
}

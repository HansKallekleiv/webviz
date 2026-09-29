import { hashString, mulberry32 } from "./prng";
import { SYNTH } from "./synth";

export type SynthParameterDefinition = {
    name: string;
    groupName: string | null;
    min: number;
    max: number;
};

export const SYNTH_PARAMETERS: readonly SynthParameterDefinition[] = [
    { name: "PORO_MULT", groupName: "GEO", min: 0.8, max: 1.2 },
    { name: "PERM_MULT", groupName: "GEO", min: 0.5, max: 2 },
    { name: "OWC", groupName: null, min: 1600, max: 1700 },
];

export function getSynthParameterValues(definition: SynthParameterDefinition): number[] {
    const rng = mulberry32(hashString(`param:${definition.name}`));
    return SYNTH.realizations.map(() => definition.min + rng() * (definition.max - definition.min));
}

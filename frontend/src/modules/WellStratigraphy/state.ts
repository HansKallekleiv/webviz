import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Wellbore } from "@framework/Wellbore";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

export type State = { ensembleIdent: EnsembleIdent | null; wellboreAddress: Wellbore | null };

import type { Difficulty } from "../models";
import type { ExerciseTypeDefinition } from "./types";
import { formalization } from "./types/formalization";
import { formulaToStatement } from "./types/formula-to-statement";
import { naturalDeduction } from "./types/natural-deduction";
import { guidedResolution } from "./types/guided-resolution";
import { truthTable } from "./types/truth-table";
export const difficultyLabels: Record<Difficulty, string> = {
  basica: "Básica",
  media: "Media",
  avanzada: "Avanzada",
};

export const exerciseTypes: Record<string, ExerciseTypeDefinition> = {
  formalization,
  "truth-table": truthTable,
  "natural-deduction": naturalDeduction,
  resolution: guidedResolution,
  "formula-to-statement": formulaToStatement,
};

import { grade } from "../logic/grading";
import type { Difficulty } from "../models";
export const difficultyLabels: Record<Difficulty, string> = {
  basica: "Básica",
  media: "Media",
  avanzada: "Avanzada",
};

export const exerciseTypes: Record<string, { label: string; grade: typeof grade }> = {
  formalization: { label: "Formalización", grade },
};

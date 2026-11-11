import type { ComponentType } from "react";
import type { Exercise } from "../../../domain/models";
import { formalizationUi } from "./types/formalization";
import { formulaToStatementUi } from "./types/formula-to-statement";
import { naturalDeductionUi } from "./types/natural-deduction";
import { guidedResolutionUi } from "./types/guided-resolution";
import { truthTableUi } from "./types/truth-table";

export type EditorProps = {
  exercise: Exercise;
  value: string;
  onChange: (answer: string) => void;
  preview?: boolean;
};
export type ExerciseTypeUi = {
  Editor: ComponentType<EditorProps>;
  Statement: ComponentType<{ exercise: Exercise }>;
  Solution: ComponentType<{ exercise: Exercise }>;
};
export const editorRegistry: Record<string, ExerciseTypeUi> = {
  formalization: formalizationUi,
  "truth-table": truthTableUi,
  "natural-deduction": naturalDeductionUi,
  resolution: guidedResolutionUi,
  "formula-to-statement": formulaToStatementUi,
};

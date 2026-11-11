import type { Grade } from "../../logic/grading";
import type { Exercise } from "../../models";
export type ExerciseTypeDefinition = {
  label: string;
  /** Throws DomainError when the authored exercise data is invalid. */
  validate: (exercise: Exercise) => void;
  /** Never throws for student input; returns status "invalid" instead. */
  grade: (answer: string, exercise: Exercise) => Grade;
};

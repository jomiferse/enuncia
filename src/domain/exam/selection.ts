import { DomainError } from "../errors";
import type { Difficulty, Exercise } from "../models";
import { BALANCED_EXAM_COUNTS, EXAM_SIZE } from "./config";
import { shuffle } from "./shuffle";
export function selectExam(
  exercises: Exercise[],
  difficulty: Difficulty | "all" = "all",
): string[] {
  const pool = exercises.filter(
    (e) => difficulty === "all" || e.difficulty === difficulty,
  );
  if (pool.length < EXAM_SIZE)
    throw new DomainError("Se necesitan al menos diez ejercicios para este simulacro.", "insufficientExamExercises");
  if (difficulty !== "all")
    return shuffle(pool)
      .slice(0, EXAM_SIZE)
      .map((e) => e.id);
  const selected = Object.entries(BALANCED_EXAM_COUNTS).flatMap(([d, n]) =>
    shuffle(pool.filter((e) => e.difficulty === d)).slice(0, n),
  );
  const chosen = new Set(selected.map((e) => e.id));
  if (selected.length < EXAM_SIZE)
    selected.push(
      ...shuffle(pool.filter((e) => !chosen.has(e.id))).slice(
        0,
        EXAM_SIZE - selected.length,
      ),
    );
  return shuffle(selected).map((e) => e.id);
}

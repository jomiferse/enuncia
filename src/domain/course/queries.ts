import type { Attempt, Difficulty, Exercise } from "../models";
import { exerciseStats } from "../progress/statistics";
export const EXERCISES_PER_PAGE = 10;
export function summarizeExercises(pool: Exercise[], attempts: Attempt[]) {
  const stats = pool.map((e) => exerciseStats(e.id, attempts));
  return {
    total: pool.length,
    complete: stats.filter((s) => s.solved).length,
    incomplete: stats.filter((s) => s.attempts > 0 && !s.solved).length,
    untouched: stats.filter((s) => s.attempts === 0).length,
    pending: stats.filter((s) => s.pending).length,
  };
}
export function filterExercisePool(
  pool: Exercise[],
  attempts: Attempt[],
  options: {
    blockId: string;
    difficulty: Difficulty | "all";
    query: string;
    errorsOnly: boolean;
  },
) {
  return pool.filter(
    (e) =>
      e.blockId === options.blockId &&
      (options.difficulty === "all" || e.difficulty === options.difficulty) &&
      (!options.errorsOnly || exerciseStats(e.id, attempts).pending) &&
      `${e.title} ${e.statement} ${e.tags.join(" ")}`
        .toLocaleLowerCase("es")
        .includes(options.query.toLocaleLowerCase("es")),
  );
}
export function exercisePage(pool: Exercise[], requested: number) {
  const count = Math.max(1, Math.ceil(pool.length / EXERCISES_PER_PAGE));
  const page = Math.max(0, Math.min(requested, count - 1));
  return {
    page,
    count,
    items: pool.slice(
      page * EXERCISES_PER_PAGE,
      (page + 1) * EXERCISES_PER_PAGE,
    ),
  };
}

import type { Area, Attempt, Block, Difficulty, Exercise } from "./types";
import { exerciseStats } from "./progress";
export const EXERCISES_PER_PAGE = 10;
export function validateCourse(areas: Area[], blocks: Block[]) {
  const areaIds = new Set(areas.map((a) => a.id));
  if (
    !areas.length ||
    areaIds.size !== areas.length ||
    areas.some((a) => !a.id || !a.title || !a.description || !a.symbol)
  )
    throw new Error(
      "Las áreas deben tener identificadores únicos y contenido completo.",
    );
  const blockIds = new Set(blocks.map((b) => b.id));
  if (
    blockIds.size !== blocks.length ||
    blocks.some(
      (b) =>
        !b.id ||
        !areaIds.has(b.areaId) ||
        !b.title ||
        !b.subtitle ||
        !b.description ||
        !b.type,
    )
  )
    throw new Error(
      "Los bloques deben tener identificadores únicos, un área registrada y contenido completo.",
    );
}
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

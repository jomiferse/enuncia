import type { Attempt, Exercise } from "../models";
export function exerciseStats(id: string, attempts: Attempt[]) {
  const own = attempts
    .filter((a) => a.exerciseId === id)
    .sort((a, b) => a.timestamp - b.timestamp);
  const last = own.at(-1);
  const first = own[0];
  return {
    attempts: own.length,
    solved: own.some((a) => a.status === "correct"),
    firstUnaided: first?.status === "correct" && !first.aided,
    pending: Boolean(last && last.status !== "correct"),
    last,
  };
}

export function summarizeProgress(pool: Exercise[], attempts: Attempt[]) {
  const stats = pool.map(exercise => exerciseStats(exercise.id, attempts));
  return {
    complete: stats.filter(stat => stat.solved).length,
    first: stats.filter(stat => stat.firstUnaided).length,
    errors: stats.filter(stat => stat.pending).length,
  };
}

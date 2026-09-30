import type { Attempt, Exam, Exercise, Progress, Difficulty } from "./types";
export const STORAGE_KEY = "practica-logica.progress.v1";
export const emptyProgress = (): Progress => ({
  version: 1,
  drafts: {},
  attempts: [],
  exams: [],
  activeExam: null,
});
const object = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const date = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x) && x > 0;
function validExam(x: unknown, finished: boolean): x is Exam {
  return (
    object(x) &&
    typeof x.id === "string" &&
    x.id.length > 0 &&
    Array.isArray(x.exerciseIds) &&
    x.exerciseIds.length === 10 &&
    x.exerciseIds.every((i) => typeof i === "string") &&
    new Set(x.exerciseIds).size === 10 &&
    object(x.answers) &&
    Object.entries(x.answers).every(
      ([k, v]) =>
        x.exerciseIds instanceof Array &&
        x.exerciseIds.includes(k) &&
        typeof v === "string" &&
        v.length <= 1000,
    ) &&
    date(x.startedAt) &&
    (finished
      ? date(x.finishedAt) && x.finishedAt >= x.startedAt
      : x.finishedAt === undefined)
  );
}
export function readProgress(value: unknown): Progress {
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.attempts) ||
    !Array.isArray(value.exams) ||
    !(value.activeExam === null || validExam(value.activeExam, false))
  )
    throw new Error(
      "El archivo no tiene un formato de progreso compatible (versión 1).",
    );
  if (
    value.drafts !== undefined &&
    (!object(value.drafts) ||
      Object.values(value.drafts).some(
        (d) =>
          !object(d) ||
          typeof d.answer !== "string" ||
          d.answer.length > 1000 ||
          !Number.isInteger(d.hints) ||
          Number(d.hints) < 0 ||
          Number(d.hints) > 2 ||
          typeof d.revealed !== "boolean",
      ))
  )
    throw new Error("Hay un borrador de práctica inválido.");
  const seen = new Set<string>();
  for (const x of value.attempts) {
    if (
      !object(x) ||
      typeof x.id !== "string" ||
      !x.id ||
      seen.has(x.id) ||
      typeof x.exerciseId !== "string" ||
      !x.exerciseId ||
      typeof x.answer !== "string" ||
      x.answer.length > 1000 ||
      !["correct", "incorrect", "invalid", "revealed"].includes(
        String(x.status),
      ) ||
      typeof x.aided !== "boolean" ||
      !date(x.timestamp) ||
      !["practice", "exam"].includes(String(x.mode)) ||
      (x.examId !== undefined && typeof x.examId !== "string") ||
      (x.mode === "exam" && typeof x.examId !== "string")
    )
      throw new Error("Hay un intento inválido o repetido en el archivo.");
    seen.add(x.id);
  }
  const examIds = new Set<string>();
  for (const exam of value.exams) {
    if (!validExam(exam, true) || examIds.has(exam.id))
      throw new Error("Hay un simulacro inválido o repetido en el archivo.");
    examIds.add(exam.id);
  }
  if (value.activeExam && examIds.has(value.activeExam.id as string))
    throw new Error("El simulacro activo ya consta como terminado.");
  return { ...value, drafts: value.drafts ?? {} } as unknown as Progress;
}
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  const attempts = [
    ...new Map(
      [...incoming.attempts, ...current.attempts].map((a) => [a.id, a]),
    ).values(),
  ].sort((a, b) => a.timestamp - b.timestamp);
  const exams = [
    ...new Map(
      [...incoming.exams, ...current.exams].map((e) => [e.id, e]),
    ).values(),
  ].sort((a, b) => a.startedAt - b.startedAt);
  const activeExam = current.activeExam ?? incoming.activeExam;
  return {
    version: 1,
    drafts: { ...incoming.drafts, ...current.drafts },
    attempts,
    exams,
    activeExam:
      activeExam && exams.some((e) => e.id === activeExam.id)
        ? null
        : activeExam,
  };
}
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
export function shuffle<T>(
  array: T[],
  random: () => number = Math.random,
): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function selectExam(
  exercises: Exercise[],
  difficulty: Difficulty | "all" = "all",
): string[] {
  const pool = exercises.filter(
    (e) => difficulty === "all" || e.difficulty === difficulty,
  );
  if (pool.length < 10)
    throw new Error(
      "Se necesitan al menos diez ejercicios para este simulacro.",
    );
  if (difficulty !== "all")
    return shuffle(pool)
      .slice(0, 10)
      .map((e) => e.id);
  const counts: Record<Difficulty, number> = {
    basica: 3,
    media: 4,
    avanzada: 3,
  };
  const selected = Object.entries(counts).flatMap(([d, n]) =>
    shuffle(pool.filter((e) => e.difficulty === d)).slice(0, n),
  );
  const chosen = new Set(selected.map((e) => e.id));
  if (selected.length < 10)
    selected.push(
      ...shuffle(pool.filter((e) => !chosen.has(e.id))).slice(
        0,
        10 - selected.length,
      ),
    );
  return shuffle(selected).map((e) => e.id);
}

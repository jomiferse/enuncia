import { DomainError } from "../errors";
import { EXAM_SIZE } from "../exam/config";
import { MAX_FORMULA_LENGTH } from "../logic/limits";
import type { Exam, Progress } from "../models";
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
    x.exerciseIds.length === EXAM_SIZE &&
    x.exerciseIds.every((i) => typeof i === "string") &&
    new Set(x.exerciseIds).size === EXAM_SIZE &&
    object(x.answers) &&
    Object.entries(x.answers).every(
      ([k, v]) =>
        x.exerciseIds instanceof Array &&
        x.exerciseIds.includes(k) &&
        typeof v === "string" &&
        v.length <= MAX_FORMULA_LENGTH,
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
    throw new DomainError("El archivo no tiene un formato de progreso compatible (versión 1).", "incompatibleProgress");
  if (
    value.drafts !== undefined &&
    (!object(value.drafts) ||
      Object.values(value.drafts).some(
        (d) =>
          !object(d) ||
          typeof d.answer !== "string" ||
          d.answer.length > MAX_FORMULA_LENGTH ||
          !Number.isInteger(d.hints) ||
          Number(d.hints) < 0 ||
          Number(d.hints) > 2 ||
          typeof d.revealed !== "boolean",
      ))
  )
    throw new DomainError("Hay un borrador de práctica inválido.", "invalidDraft");
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
      x.answer.length > MAX_FORMULA_LENGTH ||
      !["correct", "incorrect", "invalid", "revealed"].includes(
        String(x.status),
      ) ||
      typeof x.aided !== "boolean" ||
      !date(x.timestamp) ||
      !["practice", "exam"].includes(String(x.mode)) ||
      (x.examId !== undefined && typeof x.examId !== "string") ||
      (x.mode === "exam" && typeof x.examId !== "string")
    )
      throw new DomainError("Hay un intento inválido o repetido en el archivo.", "invalidAttempt");
    seen.add(x.id);
  }
  const examIds = new Set<string>();
  for (const exam of value.exams) {
    if (!validExam(exam, true) || examIds.has(exam.id))
      throw new DomainError("Hay un simulacro inválido o repetido en el archivo.", "invalidExam");
    examIds.add(exam.id);
  }
  if (value.activeExam && examIds.has(value.activeExam.id as string))
    throw new DomainError("El simulacro activo ya consta como terminado.", "examAlreadyFinished");
  return { ...value, drafts: value.drafts ?? {} } as unknown as Progress;
}

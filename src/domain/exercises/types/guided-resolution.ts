/**
 * Ejercicios de resolución guiada (enunciados y predicados), change `guided-resolution-flow`.
 *
 * `exercise.data` = `GuidedExerciseData` (ver logic/guided-types.ts): language, premises, conclusion, atoms
 * (enunciados) o signature (predicados) + valid/consistent (predicados), y `reference` (solución completa).
 * `validate()` exige que premisas/conclusión parseen y que la solución de referencia pase el propio corrector.
 * Respuesta (string): JSON de `GuidedAnswer`; "" = sin responder.
 */
import { DomainError, type MessageCode } from "../../errors";
import { contextOf, evaluateGuided, firstProblem, parseGuidedAnswer, startFormulas } from "../../logic/guided";
import type { GuidedExerciseData } from "../../logic/guided-types";
import { MAX_ATOMS } from "../../logic/limits";
import { validateSignature } from "../../logic/predicates";
import type { Exercise } from "../../models";
import type { ExerciseTypeDefinition } from ".";

const bad = (e: Exercise, field: string) =>
  new DomainError(`Datos de resolución no válidos en ${e.id}: ${field}`, "guided.invalidData" as MessageCode, { value1: e.id, value2: field });
const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

export function readGuidedData(e: Exercise): GuidedExerciseData {
  const d = e.data;
  if (!isRecord(d)) throw bad(e, "data");
  if (d.language !== "propositional" && d.language !== "predicate") throw bad(e, "language");
  if (!Array.isArray(d.premises) || d.premises.length < 1 || d.premises.length > 6 || d.premises.some((p) => typeof p !== "string" || !p.trim())) throw bad(e, "premises");
  if (typeof d.conclusion !== "string" || !d.conclusion.trim()) throw bad(e, "conclusion");
  if (!isRecord(d.reference)) throw bad(e, "reference");
  if (d.language === "propositional") {
    const atoms = d.atoms;
    if (!Array.isArray(atoms) || !atoms.length || atoms.length > MAX_ATOMS || atoms.some((a) => typeof a !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(a))) throw bad(e, "atoms");
  } else {
    const sig = d.signature;
    if (!isRecord(sig) || !Array.isArray(sig.predicates) || !sig.predicates.length || !Array.isArray(sig.constants ?? [])) throw bad(e, "signature");
    if (typeof d.valid !== "boolean" || typeof d.consistent !== "boolean") throw bad(e, "valid/consistent");
  }
  const data = d as unknown as GuidedExerciseData;
  if (data.language === "predicate") {
    data.signature!.constants ??= [];
    const ctx = contextOf(data);
    if (ctx.language === "predicate") validateSignature(ctx.signature);
  }
  return data;
}

export const guidedResolution: ExerciseTypeDefinition = {
  label: "Resolución",
  validate(e) {
    const data = readGuidedData(e);
    try {
      startFormulas(data);
    } catch {
      throw bad(e, "premises/conclusion");
    }
    const ref = parseGuidedAnswer(JSON.stringify(data.reference));
    if (!ref || !evaluateGuided(ref, data).correct)
      throw new DomainError(`La solución de referencia no supera el corrector: ${e.id}`, "guided.referenceFails" as MessageCode, { value1: e.id });
  },
  grade(answer, e) {
    const data = readGuidedData(e);
    const parsed = parseGuidedAnswer(answer);
    if (!answer.trim()) return { status: "invalid", message: "Empieza por la forma normal.", messageCode: "guided.empty" as MessageCode };
    if (!parsed) return { status: "invalid", message: "La respuesta no se puede leer.", messageCode: "guided.unreadable" as MessageCode };
    const ev = evaluateGuided(parsed, data);
    if (ev.correct) return { status: "correct", message: "¡Correcto!", messageCode: "guided.correct" as MessageCode };
    const problem = firstProblem(ev);
    if (problem?.result.code)
      return { status: "incorrect", message: "Hay un paso incorrecto.", messageCode: problem.result.code, messageParams: problem.result.params, details: [describeLocation(problem.phase, problem.index)] };
    return { status: "invalid", message: "Aún no has completado todas las fases.", messageCode: "guided.incomplete" as MessageCode };
  },
};

/** Texto en español de la ubicación del primer error (fase y paso). */
export function describeLocation(phase: string, index: number): string {
  const step = index + 1;
  const [group, sub] = phase.split(".");
  if (group === "nf") return sub === "conclusion" ? `Forma normal · negación de la conclusión · paso ${step + 1}` : `Forma normal · premisa ${Number(sub) + 1} · paso ${step + 1}`;
  const where = group === "refute" ? "Razonamiento" : "Consistencia de las premisas";
  const what = sub === "simplify" ? `conjunto de cláusulas · paso ${step + 1}` : sub === "tree" ? `árbol de resolución · paso ${step}` : sub === "possible" ? "¿hay árbol de resolución?" : "conclusión";
  return `${where} · ${what}`;
}

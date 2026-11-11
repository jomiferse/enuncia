import { DomainError } from "../../errors";
import {
  canonicalRule,
  checkProofWith,
  inferenceRules,
  previewProofWith,
  propositionalSystem,
  quantifierRules,
  type FormulaSystem,
  type ProofResult,
  type ProofRule,
} from "../../logic/deduction";
import type { Grade } from "../../logic/grading";
import { MAX_ATOMS } from "../../logic/limits";
import { predicateSystem } from "../../logic/predicate-deduction";
import { validateSignature, type PredicateSignature } from "../../logic/predicates";
import type { Exercise } from "../../models";
import type { ExerciseTypeDefinition } from ".";

/**
 * Datos (`exercise.data`) de un ejercicio de deducción natural:
 *   language: "propositional" | "predicate"
 *   premises: string[]            fórmulas (puede estar vacío)
 *   conclusion: string
 *   atoms: { P: "texto" }         solo enunciados (diccionario de átomos)
 *   signature: { predicates: [{name, arity, reading}], constants: [{name, reading}], variables?: string[] }   solo predicados
 *   rules?: string[]              reglas de inferencia permitidas (todas las del lenguaje si se omite)
 *   proof: string[]               demostración del autor, una línea por elemento
 * Respuesta del estudiante: el texto de la demostración (ver `domain/logic/deduction.ts`).
 */
export type NaturalDeductionData = {
  language: "propositional" | "predicate";
  premises: string[];
  conclusion: string;
  atoms: string[];
  atomReadings: Record<string, string>;
  signature?: PredicateSignature;
  predicates: { name: string; arity: number; reading: string }[];
  constants: { name: string; reading: string }[];
  rules?: ProofRule[];
  proof: string[];
};

const MAX_PREMISES = 8;
const bad = (e: Exercise, detail = "") =>
  new DomainError(
    `Datos de deducción natural no válidos en ${e.id}${detail ? `: ${detail}` : ""}`,
    "deduction.invalidData",
    { value1: e.id, value2: detail },
  );
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const identifier = /^[A-Za-z][A-Za-z0-9_]*$/;

const cache = new WeakMap<Exercise, NaturalDeductionData>();

/** Sistema de fórmulas del ejercicio (enunciados o predicados). */
export function deductionSystem(data: NaturalDeductionData): FormulaSystem<unknown> {
  return (data.signature ? predicateSystem(data.signature) : propositionalSystem) as FormulaSystem<unknown>;
}

/** Reglas de inferencia disponibles en el ejercicio (en orden de presentación). */
export function availableRules(data: NaturalDeductionData): ProofRule[] {
  const base = inferenceRules.filter(r => data.language === "predicate" || !quantifierRules.includes(r));
  return data.rules ? base.filter(r => data.rules?.includes(r)) : base;
}

/** Comprueba una demostración con los datos ya leídos. */
export function checkDeduction(answer: string, data: NaturalDeductionData): ProofResult {
  return checkProofWith(deductionSystem(data), answer, {
    premises: data.premises,
    conclusion: data.conclusion,
    atoms: data.atoms,
    rules: data.rules,
  });
}

export function previewDeduction(answer: string, data: NaturalDeductionData) {
  return previewProofWith(deductionSystem(data), answer, data.atoms);
}

/** Lee y valida los datos del autor; lanza DomainError si no son válidos. Resultado en caché. */
export function readNaturalDeductionData(e: Exercise): NaturalDeductionData {
  const cached = cache.get(e);
  if (cached) return cached;
  const d = e.data;
  if (!isRecord(d) || (d.language !== "propositional" && d.language !== "predicate")) throw bad(e, "language");
  if (!Array.isArray(d.premises) || d.premises.length > MAX_PREMISES || !d.premises.every(text)) throw bad(e, "premises");
  if (!text(d.conclusion)) throw bad(e, "conclusion");
  if (!Array.isArray(d.proof) || !d.proof.length || !d.proof.every(text)) throw bad(e, "proof");
  const language = d.language;
  const premises = d.premises as string[];
  const data: NaturalDeductionData = {
    language,
    premises,
    conclusion: d.conclusion.trim(),
    atoms: [],
    atomReadings: {},
    predicates: [],
    constants: [],
    proof: d.proof as string[],
  };

  if (language === "propositional") {
    if (!isRecord(d.atoms)) throw bad(e, "atoms");
    const names = Object.keys(d.atoms);
    if (!names.length || names.length > MAX_ATOMS || names.some(a => !identifier.test(a) || !text((d.atoms as Record<string, unknown>)[a])))
      throw bad(e, "atoms");
    data.atoms = names;
    data.atomReadings = d.atoms as Record<string, string>;
  } else {
    const sig = d.signature;
    if (!isRecord(sig) || !Array.isArray(sig.predicates) || !sig.predicates.length || !Array.isArray(sig.constants ?? [])) throw bad(e, "signature");
    data.predicates = sig.predicates.map((p: unknown) => {
      if (!isRecord(p) || !text(p.name) || !Number.isInteger(p.arity) || !text(p.reading)) throw bad(e, "predicado");
      return { name: p.name, arity: p.arity as number, reading: p.reading };
    });
    data.constants = ((sig.constants ?? []) as unknown[]).map(c => {
      if (!isRecord(c) || !text(c.name) || !text(c.reading)) throw bad(e, "constante");
      return { name: c.name, reading: c.reading };
    });
    if (sig.variables !== undefined && (!Array.isArray(sig.variables) || !sig.variables.every(text))) throw bad(e, "variables");
    data.signature = {
      predicates: Object.fromEntries(data.predicates.map(p => [p.name, p.arity])),
      constants: data.constants.map(c => c.name),
      ...(sig.variables ? { variables: sig.variables as string[] } : {}),
    };
    validateSignature(data.signature);
  }

  if (d.rules !== undefined) {
    if (!Array.isArray(d.rules) || !d.rules.length) throw bad(e, "rules");
    const rules = d.rules.map(r => (typeof r === "string" ? canonicalRule(r) : undefined));
    if (rules.some(r => !r || r === "Premisa" || r === "Hipótesis" || (language === "propositional" && quantifierRules.includes(r))))
      throw bad(e, "rules");
    data.rules = rules as ProofRule[];
  }

  // Premisas y conclusión deben leerse; la demostración del autor debe pasar el comprobador.
  const sys = deductionSystem(data);
  for (const f of [...premises, data.conclusion]) sys.parse(f, data.atoms);
  const result = checkDeduction(data.proof.join("\n"), data);
  if (result.status !== "correct")
    throw new DomainError(
      `La demostración del autor de ${e.id} no es correcta: ${result.message}`,
      "deduction.authorProofFails",
      { value1: e.id, value2: result.message },
    );
  cache.set(e, data);
  return data;
}

export const naturalDeduction: ExerciseTypeDefinition = {
  label: "Deducción natural",
  validate: e => void readNaturalDeductionData(e),
  grade(answer, e): Grade {
    const data = readNaturalDeductionData(e);
    const r = checkDeduction(answer, data);
    return {
      status: r.status,
      message: r.message,
      messageCode: r.messageCode,
      messageParams: r.messageParams,
    };
  },
};

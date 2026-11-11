import { DomainError } from "../../errors";
import {
  formatPredicateFormula,
  isClosed,
  parsePredicateFormula,
  type PredicateSignature,
} from "../../logic/predicates";
import type { Exercise } from "../../models";
import type { ExerciseTypeDefinition } from ".";

export type StatementOption = { id: string; text: string; correct: boolean; why: string };
export type FormulaToStatementData = {
  formula: string;
  /** Formula normalized by the predicate parser. */
  normalized: string;
  predicates: { name: string; arity: number; reading: string }[];
  constants: { name: string; reading: string }[];
  options: StatementOption[];
};

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 3;
const bad = (e: Exercise, detail = "") =>
  new DomainError(`Datos de «fórmula a enunciado» no válidos en ${e.id}${detail ? `: ${detail}` : ""}`, "predicates.invalidData", { value1: e.id });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/** Reads and validates the authored data; throws DomainError when invalid. */
export function readFormulaToStatementData(e: Exercise): FormulaToStatementData {
  const d = e.data;
  if (!isRecord(d) || !text(d.formula) || !isRecord(d.signature) || !Array.isArray(d.options)) throw bad(e);
  const sig = d.signature;
  if (!Array.isArray(sig.predicates) || !sig.predicates.length || !Array.isArray(sig.constants ?? [])) throw bad(e, "signatura");
  const predicates = sig.predicates.map((p: unknown) => {
    if (!isRecord(p) || !text(p.name) || !Number.isInteger(p.arity) || !text(p.reading)) throw bad(e, "predicado");
    return { name: p.name, arity: p.arity as number, reading: p.reading };
  });
  const constants = ((sig.constants ?? []) as unknown[]).map((c) => {
    if (!isRecord(c) || !text(c.name) || !text(c.reading)) throw bad(e, "constante");
    return { name: c.name, reading: c.reading };
  });
  const signature: PredicateSignature = {
    predicates: Object.fromEntries(predicates.map((p) => [p.name, p.arity])),
    constants: constants.map((c) => c.name),
  };
  if (Object.keys(signature.predicates).length !== predicates.length) throw bad(e, "predicados repetidos");
  const ast = parsePredicateFormula(d.formula, signature);
  if (!isClosed(ast)) throw bad(e, "la fórmula debe estar cerrada");
  if (d.options.length < MIN_OPTIONS || d.options.length > MAX_OPTIONS) throw bad(e, "número de opciones");
  const options = d.options.map((o: unknown) => {
    if (!isRecord(o) || !text(o.id) || !text(o.text) || (o.correct !== undefined && typeof o.correct !== "boolean")) throw bad(e, "opción");
    const correct = o.correct === true;
    if (!correct && !text(o.why)) throw bad(e, `falta explicación en la opción ${o.id}`);
    return { id: o.id.trim(), text: o.text, correct, why: typeof o.why === "string" ? o.why : "" };
  });
  if (new Set(options.map((o) => o.id)).size !== options.length || new Set(options.map((o) => o.text)).size !== options.length)
    throw bad(e, "opciones repetidas");
  const correctCount = options.filter((o) => o.correct).length;
  if (correctCount !== 1)
    throw new DomainError(`Debe haber exactamente una opción correcta en ${e.id}`, "predicates.correctOptionCount", { value1: e.id, value2: correctCount });
  return { formula: d.formula, normalized: formatPredicateFormula(ast), predicates, constants, options };
}

export const formulaToStatement: ExerciseTypeDefinition = {
  label: "Fórmulas a enunciados",
  validate: (e) => void readFormulaToStatementData(e),
  grade(answer, e) {
    const data = readFormulaToStatementData(e);
    const chosen = data.options.find((o) => o.id === answer.trim());
    if (!chosen)
      return { status: "invalid", message: "Elige un enunciado para continuar.", messageCode: "predicates.noOptionSelected" };
    if (chosen.correct)
      return { status: "correct", message: "¡Correcto! Ese enunciado expresa la fórmula.", messageCode: "predicates.correctOption", interpreted: chosen.text };
    return {
      status: "incorrect",
      message: "Ese enunciado no equivale a la fórmula.",
      messageCode: "predicates.incorrectOption",
      interpreted: chosen.text,
      details: [chosen.why],
    };
  },
};

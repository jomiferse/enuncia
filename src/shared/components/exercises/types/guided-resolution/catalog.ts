import {
  emptyClausePhase,
  emptyGuidedAnswer,
  type ClausePhaseAnswer,
  type GuidedAnswer,
  type GuidedExerciseData,
  type LawId,
  type SimplifyKind,
} from "../../../../../domain/logic/guided-types";
import type { Exercise } from "../../../../../domain/models";

const COMMON_LAWS: LawId[] = [
  "imp", "deMorganAnd", "deMorganOr", "doubleNeg", "distribOrAnd",
  "idemAnd", "idemOr", "contradiction", "tautology",
  "neutralAnd", "absorbOrTop", "absorbAndBottom", "neutralOr", "absorbAnd", "absorbOr",
];
/** Leyes que se ofrecen en enunciados (las 15 primeras y «FNC»). */
export const PROPOSITIONAL_LAWS: LawId[] = [...COMMON_LAWS, "fnc"];
/** Leyes que se ofrecen en predicados (todas salvo «FNC», con «FNS»). */
export const PREDICATE_LAWS: LawId[] = [
  ...COMMON_LAWS, "notForall", "notExists", "renameForall", "renameExists", "moveForall", "skolem", "fns",
];
export const SIMPLIFY_KINDS: SimplifyKind[] = ["subsumption", "pure", "tautology", "repeated", "none"];
export const MAX_STEPS = 40;

export const isTerminalLaw = (law: LawId): boolean => law === "fnc" || law === "fns";

export type GuidedContext = {
  data: GuidedExerciseData;
  predicate: boolean;
  /** átomos, predicados, constantes… para la barra de símbolos */
  names: string[];
  /** pintar el estado de cada paso */
  showStatus: boolean;
  /** bloquear fases hasta que las anteriores estén correctas */
  lockPhases: boolean;
  readOnly: boolean;
};

type Loose = Record<string, unknown>;
const isRecord = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

/** Los datos del ejercicio, tal como los valida el dominio (aquí solo se comprueba la forma básica). */
export function readGuidedData(exercise: Exercise): GuidedExerciseData {
  const d = exercise.data;
  if (!isRecord(d) || !Array.isArray(d.premises) || typeof d.conclusion !== "string")
    throw new Error(`Datos de resolución no válidos en ${exercise.id}`);
  return d as unknown as GuidedExerciseData;
}

export type SymbolEntry = { name: string; arity?: number; reading?: string };

/** Átomos (con lectura si existe) de un ejercicio de enunciados. */
export function atomEntries(data: GuidedExerciseData): SymbolEntry[] {
  const raw: unknown = data.atoms;
  if (Array.isArray(raw)) return raw.map(a => ({ name: String(a) }));
  if (isRecord(raw)) return Object.entries(raw).map(([name, reading]) => ({ name, reading: typeof reading === "string" ? reading : undefined }));
  return [];
}

/** Símbolos de la signatura de un ejercicio de predicados (acepta lista de objetos o diccionario). */
export function signatureEntries(data: GuidedExerciseData): {
  predicates: SymbolEntry[];
  constants: SymbolEntry[];
  functions: SymbolEntry[];
  variables: string[];
} {
  const sig: Loose = isRecord(data.signature) ? (data.signature as unknown as Loose) : {};
  const named = (list: unknown, withArity: boolean): SymbolEntry[] => {
    if (Array.isArray(list))
      return list.map(item =>
        isRecord(item)
          ? { name: String(item.name), arity: withArity ? Number(item.arity) : undefined, reading: typeof item.reading === "string" ? item.reading : undefined }
          : { name: String(item) },
      );
    if (isRecord(list)) return Object.entries(list).map(([name, arity]) => ({ name, arity: withArity ? Number(arity) : undefined }));
    return [];
  };
  const variables = Array.isArray(sig.variables) ? sig.variables.map(String) : ["x", "y", "z", "u", "v", "w"];
  return {
    predicates: named(sig.predicates, true),
    constants: named(sig.constants, false),
    functions: named(sig.functions, true),
    variables,
  };
}

export function makeContext(data: GuidedExerciseData, options: { preview: boolean; readOnly?: boolean }): GuidedContext {
  const predicate = data.language === "predicate";
  const names = predicate
    ? (() => {
        const s = signatureEntries(data);
        return [...s.predicates, ...s.constants, ...s.functions].map(e => e.name).concat(s.variables.slice(0, 3));
      })()
    : atomEntries(data).map(e => e.name);
  return { data, predicate, names, showStatus: options.preview && !options.readOnly, lockPhases: options.preview && !options.readOnly, readOnly: !!options.readOnly };
}

const ascii: [RegExp, string][] = [
  [/<->/g, "↔"], [/->/g, "→"], [/~|!/g, "¬"], [/&/g, "∧"], [/\|/g, "∨"], [/\bforall\b/g, "∀"], [/\bexists\b/g, "∃"],
];
/** Muestra las fórmulas del autor con los símbolos habituales. */
export const normalizeFormula = (text: string): string => ascii.reduce((s, [from, to]) => s.replace(from, to), text);

/** Literales de una cláusula escrita como `{A, ¬B}`, `A ∨ ¬B` o `{P(x, y), ¬Q}`. */
export function splitLiterals(clause: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  const flush = () => {
    const literal = current.trim();
    if (literal && literal !== "□") out.push(literal);
    current = "";
  };
  for (const ch of clause.replace(/[{}]/g, "")) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if ((ch === "," && depth <= 0) || ch === "∨") flush();
    else current += ch;
  }
  flush();
  return out;
}

const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const normalizePhase = (p: Partial<ClausePhaseAnswer> | undefined): ClausePhaseAnswer => ({
  ...emptyClausePhase(),
  ...(p ?? {}),
  simplify: list(p?.simplify),
  tree: list(p?.tree),
  possible: typeof p?.possible === "boolean" ? p.possible : null,
});

/** Completa una respuesta parcial o antigua con la estructura vacía. */
export function normalizeAnswer(answer: GuidedAnswer | null, premiseCount: number): GuidedAnswer {
  const base = emptyGuidedAnswer(premiseCount);
  if (!answer || typeof answer !== "object") return base;
  const premises = Array.from({ length: premiseCount }, (_, i) => list<GuidedAnswer["nf"]["negConclusion"][number]>(answer.nf?.premises?.[i]));
  return {
    nf: { premises, negConclusion: list(answer.nf?.negConclusion) },
    refute: normalizePhase(answer.refute),
    valid: typeof answer.valid === "boolean" ? answer.valid : null,
    premisesPhase: normalizePhase(answer.premisesPhase),
    consistent: typeof answer.consistent === "boolean" ? answer.consistent : null,
  };
}

const phaseBlank = (p: ClausePhaseAnswer) => !p.simplify.length && p.possible === null && !p.tree.length;
export const isBlankAnswer = (a: GuidedAnswer): boolean =>
  a.nf.premises.every(s => !s.length) && !a.nf.negConclusion.length && phaseBlank(a.refute) && a.valid === null && phaseBlank(a.premisesPhase) && a.consistent === null;

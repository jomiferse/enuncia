/**
 * Forma clausal (enunciados): literales, cláusulas como conjuntos, CNF, parseo y formato de texto.
 *
 * TEXTO DE CLÁUSULAS
 *   cláusula:  `{P, ¬Q}` (también `{P, ~Q}`, `{ P , !Q }`), o disyunción sin llaves `P ∨ ¬Q` / `P | ~Q`.
 *              La cláusula vacía se escribe `□`, `{}`, `[]` o `⊥`. Los literales repetidos se colapsan.
 *   conjunto:  cláusulas separadas por coma, `;` o salto de línea: `{P, ¬Q}, {Q}, □`. Se admiten llaves
 *              exteriores `{{P, ¬Q}, {Q}}`. El conjunto vacío de cláusulas (verdadero) se escribe `∅`.
 *   Ojo: `{}` es la cláusula vacía (falso), `∅` el conjunto vacío (verdadero).
 *
 * Representación canónica: `Clause` = literales únicos ordenados por átomo y, a igualdad, positivo antes
 * que negativo. `ClauseSet` = cláusulas únicas en orden de aparición.
 *
 * `toClauses(node)` devuelve la CNF sin cláusulas tautológicas ni duplicadas (sin subsunción):
 * una tautología da `[]` y una contradicción `[[]]` (contiene la cláusula vacía).
 *
 * LÍMITES: MAX_CLAUSES, MAX_CLAUSE_LITERALS, MAX_CNF_CLAUSES (toClauses; lanza DomainError).
 *
 * CÓDIGOS (clave i18n `errors.<código>`) de los fallos de parseo ({ ok: false, error }):
 *   resolution.clauseRequired      texto vacío
 *   resolution.tooLong             > MAX_ANSWER_LENGTH
 *   resolution.tooManyClauses      > MAX_CLAUSES                       (max)
 *   resolution.tooManyLiterals     > MAX_CLAUSE_LITERALS                (max)
 *   resolution.badLiteral          literal ilegible                    (value)
 *   resolution.badClause           cláusula mal formada (llaves, etc.) (value)
 *   unknownAtom                    átomo no definido                   (value1, value2)  [código común]
 *   resolution.cnfTooLarge         toClauses (DomainError): la CNF supera MAX_CNF_CLAUSES
 *   resolution.notEquivalent       checkClauseConversion: ver resolution.ts
 * Si hay una línea o posición, el parseo de línea la añade en resolution.ts.
 */
import { DomainError, type MessageCode, type MessageParams } from "../errors";
import { evaluate } from "./evaluation";
import { MAX_ANSWER_LENGTH, MAX_ATOMS } from "./limits";
import type { Node } from "./types";

export const MAX_CLAUSES = 50;
export const MAX_CLAUSE_LITERALS = 16;
export const MAX_CNF_CLAUSES = 256;

export type Literal = { atom: string; negated: boolean };
export type Clause = Literal[];
export type ClauseSet = Clause[];

export type ClauseFailure = { messageCode: MessageCode; messageParams: MessageParams; message: string };
export type ClauseParse = { ok: true; clause: Clause } | { ok: false; error: ClauseFailure };
export type ClauseSetParse = { ok: true; clauses: ClauseSet } | { ok: false; error: ClauseFailure };

function failure(code: string, message: string, params: MessageParams = {}): { ok: false; error: ClauseFailure } {
  return { ok: false, error: { messageCode: code as MessageCode, messageParams: params, message } };
}

// ---------------------------------------------------------------- operaciones básicas

export function normalizeClause(literals: Literal[]): Clause {
  const seen = new Set<string>();
  const out: Clause = [];
  for (const l of literals) {
    const key = `${l.atom}|${l.negated}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ atom: l.atom, negated: l.negated });
  }
  return out.sort((a, b) => (a.atom < b.atom ? -1 : a.atom > b.atom ? 1 : Number(a.negated) - Number(b.negated)));
}

export const isEmptyClause = (c: Clause) => c.length === 0;
export const isTautologicalClause = (c: Clause) => c.some(l => c.some(m => m.atom === l.atom && m.negated !== l.negated));
export const clauseKey = (c: Clause) => normalizeClause(c).map(l => (l.negated ? "-" : "+") + l.atom).join(" ");
export const sameClause = (a: Clause, b: Clause) => clauseKey(a) === clauseKey(b);

export function dedupeClauses(clauses: ClauseSet): ClauseSet {
  const seen = new Set<string>();
  const out: ClauseSet = [];
  for (const c of clauses) {
    const k = clauseKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(normalizeClause(c));
  }
  return out;
}

export const formatLiteral = (l: Literal) => (l.negated ? `¬${l.atom}` : l.atom);
export const formatClause = (c: Clause) => (c.length ? `{${normalizeClause(c).map(formatLiteral).join(", ")}}` : "□");
export const formatClauseSet = (cs: ClauseSet) => (cs.length ? cs.map(formatClause).join(", ") : "∅");

/** Valor de verdad de un conjunto de cláusulas (conjunción de disyunciones) bajo una asignación. */
export function evaluateClauses(cs: ClauseSet, values: Record<string, boolean>): boolean {
  return cs.every(c => c.some(l => values[l.atom] !== l.negated));
}

// ---------------------------------------------------------------- CNF

function distribute(a: ClauseSet, b: ClauseSet): ClauseSet {
  const out: ClauseSet = [];
  const seen = new Set<string>();
  for (const x of a)
    for (const y of b) {
      const merged = normalizeClause([...x, ...y]);
      if (isTautologicalClause(merged)) continue;
      const k = clauseKey(merged);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(merged);
      if (out.length > MAX_CNF_CLAUSES)
        throw new DomainError("La forma clausal es demasiado grande.", "resolution.cnfTooLarge" as MessageCode);
    }
  return out;
}

function union(a: ClauseSet, b: ClauseSet): ClauseSet {
  const out = dedupeClauses([...a, ...b]);
  if (out.length > MAX_CNF_CLAUSES)
    throw new DomainError("La forma clausal es demasiado grande.", "resolution.cnfTooLarge" as MessageCode);
  return out;
}

function cnf(n: Node, negate: boolean): ClauseSet {
  switch (n.kind) {
    case "atom":
      return [[{ atom: n.name, negated: negate }]];
    case "not":
      return cnf(n.value, !negate);
    case "and":
      return negate ? distribute(cnf(n.left, true), cnf(n.right, true)) : union(cnf(n.left, false), cnf(n.right, false));
    case "or":
      return negate ? union(cnf(n.left, true), cnf(n.right, true)) : distribute(cnf(n.left, false), cnf(n.right, false));
    case "implies":
      return negate ? union(cnf(n.left, false), cnf(n.right, true)) : distribute(cnf(n.left, true), cnf(n.right, false));
    case "iff":
      return negate
        ? union(distribute(cnf(n.left, false), cnf(n.right, false)), distribute(cnf(n.left, true), cnf(n.right, true)))
        : union(distribute(cnf(n.left, true), cnf(n.right, false)), distribute(cnf(n.right, true), cnf(n.left, false)));
  }
}

/** CNF lógicamente equivalente a la fórmula, sin tautologías ni duplicados. Puede lanzar DomainError (tamaño). */
export function toClauses(node: Node): ClauseSet {
  return cnf(node, false);
}

// ---------------------------------------------------------------- parseo

function parseLiteral(text: string, atoms: string[]): { ok: true; literal: Literal } | { ok: false; error: ClauseFailure } {
  const t = text.trim();
  const m = /^([¬~!]?)\s*([A-Za-z][A-Za-z0-9_]*)$/.exec(t);
  if (!m) return failure("resolution.badLiteral", `El literal «${t}» no es válido: usa un átomo o su negación (¬P).`, { value: t });
  if (!atoms.includes(m[2]))
    return failure("unknownAtom", `El átomo «${m[2]}» no está definido. Usa ${atoms.join(", ")}.`, { value1: m[2], value2: atoms.join(", ") });
  return { ok: true, literal: { atom: m[2], negated: m[1] !== "" } };
}

export function parseClause(text: string, atoms: string[]): ClauseParse {
  if (text.length > MAX_ANSWER_LENGTH) return failure("resolution.tooLong", "La respuesta es demasiado larga.");
  let t = text.trim();
  if (!t) return failure("resolution.clauseRequired", "Escribe una cláusula para continuar.");
  if (["□", "[]", "⊥"].includes(t)) return { ok: true, clause: [] };
  let parts: string[];
  if (t.startsWith("{") || t.endsWith("}")) {
    if (!(t.startsWith("{") && t.endsWith("}") && t.indexOf("{", 1) < 0 && t.indexOf("}") === t.length - 1))
      return failure("resolution.badClause", `La cláusula «${t}» está mal formada: usa llaves como {P, ¬Q}.`, { value: t });
    t = t.slice(1, -1).trim();
    parts = t ? t.split(",") : [];
  } else {
    parts = t.split(/[∨|]/);
  }
  if (parts.length > MAX_CLAUSE_LITERALS)
    return failure("resolution.tooManyLiterals", `Una cláusula admite como máximo ${MAX_CLAUSE_LITERALS} literales.`, { max: MAX_CLAUSE_LITERALS });
  const literals: Literal[] = [];
  for (const p of parts) {
    const r = parseLiteral(p, atoms);
    if (!r.ok) return r;
    literals.push(r.literal);
  }
  return { ok: true, clause: normalizeClause(literals) };
}

/** Separa en el nivel exterior por `,`, `;` y saltos de línea (respetando llaves). */
function splitTopLevel(text: string): string[] | undefined {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) return undefined;
    if (depth === 0 && (ch === "," || ch === ";" || ch === "\n" || ch === "\r")) {
      items.push(current);
      current = "";
    } else current += ch;
  }
  if (depth !== 0) return undefined;
  items.push(current);
  return items.map(i => i.trim()).filter(i => i);
}

export function parseClauseSet(text: string, atoms: string[]): ClauseSetParse {
  if (text.length > MAX_ANSWER_LENGTH) return failure("resolution.tooLong", "La respuesta es demasiado larga.");
  let t = text.trim();
  if (!t) return failure("resolution.clauseRequired", "Escribe las cláusulas para continuar.");
  if (t === "∅") return { ok: true, clauses: [] };
  if (t.startsWith("{") && t.endsWith("}") && t.indexOf("{", 1) >= 0) {
    const inner = t.slice(1, -1);
    const items = splitTopLevel(inner);
    // Solo es envoltorio de conjunto si cada elemento es una cláusula entre llaves o □.
    if (items && items.length && items.every(i => i === "□" || (i.startsWith("{") && i.endsWith("}")))) t = inner;
  }
  const items = splitTopLevel(t);
  if (!items) return failure("resolution.badClause", "Las llaves no están bien emparejadas.", { value: t });
  if (!items.length) return failure("resolution.clauseRequired", "Escribe las cláusulas para continuar.");
  if (items.length > MAX_CLAUSES)
    return failure("resolution.tooManyClauses", `Hay demasiadas cláusulas (máximo ${MAX_CLAUSES}).`, { max: MAX_CLAUSES });
  const clauses: ClauseSet = [];
  for (const item of items) {
    const r = parseClause(item, atoms);
    if (!r.ok) return r;
    clauses.push(r.clause);
  }
  return { ok: true, clauses: dedupeClauses(clauses) };
}

// ---------------------------------------------------------------- equivalencia por evaluación

export function assignments(atoms: string[]): Record<string, boolean>[] {
  if (atoms.length > MAX_ATOMS) throw new DomainError("Hay demasiados átomos.", "tooManyAtoms");
  const rows: Record<string, boolean>[] = [];
  for (let mask = 0; mask < 1 << atoms.length; mask++) {
    const row: Record<string, boolean> = {};
    atoms.forEach((a, i) => (row[a] = Boolean(mask & (1 << (atoms.length - 1 - i)))));
    rows.push(row);
  }
  return rows;
}

/** Primera asignación (orden de tabla, F antes que V; el último átomo varía más rápido) donde difieren, o undefined. */
export function findClauseCounterexample(cs: ClauseSet, node: Node, atoms: string[]): Record<string, boolean> | undefined {
  return assignments(atoms).find(v => evaluateClauses(cs, v) !== evaluate(node, v));
}

export function isSatisfiableClauses(cs: ClauseSet, atoms: string[]): boolean {
  return assignments(atoms).some(v => evaluateClauses(cs, v));
}

/**
 * Forma clausal de la lógica de predicados: literales con términos, parseo/formato de texto, variantes,
 * skolemización, CNF y comprobador de conversiones.
 *
 * TEXTO DE CLÁUSULAS (como clauses.ts, pero con predicados y términos)
 *   literal:   `P(x)`, `¬R(x, f(x))`, `~Q(a)`, `!Q` (predicado de aridad 0 sin paréntesis)
 *   cláusula:  `{P(x), ¬Q(x, a)}` o disyunción sin llaves `P(x) ∨ ¬Q(x, a)` / `P(x) | ~Q(x, a)`.
 *              La cláusula vacía se escribe `□`, `{}`, `[]` o `⊥`. Literales repetidos se colapsan.
 *   conjunto:  cláusulas separadas por coma, `;` o salto de línea fuera de llaves/paréntesis; `∅` = conjunto vacío.
 *   términos:  variables (las de la signatura, con sufijos opcionales de dígitos o apóstrofos: `x`, `x1`, `x'`),
 *              constantes y funciones `f(t1, ..., tn)`. Profundidad máxima de término: MAX_TERM_DEPTH.
 *   Modo estricto (`free: false`, refutación): solo símbolos declarados. Modo libre (`free: true`, conversión):
 *   se admiten constantes y funciones nuevas (símbolos de Skolem) con nombre libre y aridad coherente.
 *
 * SKOLEMIZACIÓN (`clausify`): fórmula cerrada -> forma normal negativa (sin → ni ↔) -> variables ligadas
 * renombradas aparte (x, x1, ...) -> forma prenexa (cuantificadores en orden de aparición) -> símbolos de
 * Skolem (constante si no hay ∀ delante; si no, función de los ∀ previos) -> matriz sin cuantificadores ->
 * CNF (sin tautologías sintácticas ni duplicados). Dos modos de Skolem:
 *   - "prenex": el Skolem depende de TODOS los ∀ que preceden al ∃ en el prefijo prenexo (libro de texto).
 *   - "inner":  depende solo de los ∀ que encierran al ∃ en la fórmula original (más general/pequeño).
 *
 * COMPROBACIÓN DE CONVERSIONES (`checkPredicateConversion`): las cláusulas del estudiante son correctas si son
 * ISOMORFAS a la forma clausal de referencia (de cualquiera de los dos modos): iguales salvo (a) orden de
 * cláusulas y de literales, (b) renombrado de variables dentro de cada cláusula, (c) renombrado inyectivo de
 * los símbolos de Skolem (símbolos no declarados en la signatura, respetando constante/función y aridad) y
 * (d) cláusulas tautológicas o duplicadas (salvo variantes). La equisatisfacibilidad general es indecidible,
 * por eso se compara con la forma estándar y no se acepta otra equisatisfacible no isomorfa.
 *
 * LÍMITES: MAX_CLAUSES, MAX_CLAUSE_LITERALS, MAX_CNF_CLAUSES (clauses.ts), MAX_TERM_DEPTH,
 * MAX_CLAUSIFY_FORMULAS, presupuesto de comparación (MATCH_BUDGET).
 *
 * CÓDIGOS (`errors.<código>`), además de los de clauses.ts/resolution.ts:
 *   resolution.unknownPredicate   predicado no declarado          (value1, value2: lista)
 *   resolution.unknownSymbol      símbolo no declarado (estricto) (value1, value2: lista)
 *   resolution.symbolMisuse       predicado usado como término o al revés (value)
 *   resolution.arityMismatch      aridad incorrecta               (name, expected, found)
 *   resolution.termTooDeep        término demasiado profundo      (max)
 *   resolution.notClosed          fórmula con variables libres (datos)
 *   resolution.wrongClauseCount   distinto nº de cláusulas        (found, expected)
 *   resolution.notExpectedForm    no coincide con la forma clausal esperada
 */
import { DomainError } from "../errors";
import type { MessageCode, MessageParams } from "../errors";
import {
  type ClauseFailure,
  MAX_CLAUSES,
  MAX_CLAUSE_LITERALS,
  MAX_CNF_CLAUSES,
} from "./clauses";
import { MAX_ANSWER_LENGTH } from "./limits";
import {
  type PNode,
  type PredicateSignature,
  type Term,
  formatPredicateFormula,
  formatTerm,
  freeVariables,
  signatureVariables,
  substitute,
  termVariables,
} from "./predicates";
import { type Subst, applySubst, termDepth } from "./unification";

export const MAX_TERM_DEPTH = 6;
export const MAX_CLAUSIFY_FORMULAS = 5;
const MATCH_BUDGET = 200_000;

export type PLiteral = { negated: boolean; name: string; args: Term[] };
export type PClause = PLiteral[];

export type ClauseSymbols = {
  predicates: Record<string, number>;
  constants: string[];
  functions: Record<string, number>;
  variables: string[];
  /** true: se admiten constantes/funciones nuevas (símbolos de Skolem). */
  free: boolean;
};

export function symbolsFromSignature(signature: PredicateSignature, free: boolean): ClauseSymbols {
  return {
    predicates: signature.predicates,
    constants: signature.constants,
    functions: signature.functions ?? {},
    variables: signatureVariables(signature),
    free,
  };
}

export function declaredNames(signature: PredicateSignature): Set<string> {
  return new Set([
    ...Object.keys(signature.predicates),
    ...signature.constants,
    ...signatureVariables(signature),
    ...Object.keys(signature.functions ?? {}),
  ]);
}

// ---------------------------------------------------------------- formato y operaciones

export const formatAtom = (l: PLiteral) => (l.args.length ? `${l.name}(${l.args.map(formatTerm).join(", ")})` : l.name);
export const formatPLiteral = (l: PLiteral) => (l.negated ? "¬" : "") + formatAtom(l);
export const literalKey = (l: PLiteral) => (l.negated ? "-" : "+") + formatAtom(l);

export function normalizePClause(literals: PLiteral[]): PClause {
  const seen = new Set<string>();
  const out: PClause = [];
  for (const l of literals) {
    const k = literalKey(l);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  const sortKey = (l: PLiteral) => `${l.name}|${l.negated ? 1 : 0}|${formatAtom(l)}`;
  return out.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
}

export const formatPClause = (c: PClause) => (c.length ? `{${normalizePClause(c).map(formatPLiteral).join(", ")}}` : "□");
export const formatPClauseSet = (cs: PClause[]) => (cs.length ? cs.map(formatPClause).join(", ") : "∅");
export const pClauseKey = (c: PClause) => normalizePClause(c).map(literalKey).join(" ");

export const isTautologicalPClause = (c: PClause) =>
  c.some(l => c.some(m => m.negated !== l.negated && formatAtom(l) === formatAtom(m)));

export function pClauseVariables(c: PClause): string[] {
  const out = new Set<string>();
  for (const l of c) for (const a of l.args) for (const v of termVariables(a)) out.add(v);
  return [...out];
}

export const applyToLiteral = (l: PLiteral, s: Subst): PLiteral => ({ ...l, args: l.args.map(a => applySubst(a, s)) });
export const applyToClause = (c: PClause, s: Subst): PClause => normalizePClause(c.map(l => applyToLiteral(l, s)));

export function formatSubst(s: Subst): string {
  const items = Object.entries(s)
    .filter(([v, t]) => !(t.kind === "var" && t.name === v))
    .map(([v, t]) => `${v}/${formatTerm(t)}`);
  return `{${items.join(", ")}}`;
}

/** Renombra las variables de `c` que aparecen en `avoid` (x -> x', x'', ...). */
export function renameApart(c: PClause, avoid: string[]): PClause {
  const taken = new Set([...avoid, ...pClauseVariables(c)]);
  const subst: Subst = {};
  for (const v of pClauseVariables(c)) {
    if (!avoid.includes(v)) continue;
    let name = `${v}'`;
    while (taken.has(name)) name += "'";
    taken.add(name);
    subst[v] = { kind: "var", name };
  }
  return c.map(l => applyToLiteral(l, subst));
}

export const clauseDepth = (c: PClause) => Math.max(0, ...c.flatMap(l => l.args.map(termDepth)));

// ---------------------------------------------------------------- isomorfismo (variantes, símbolos de Skolem)

type MatchState = { vars: Map<string, string>; varsRev: Map<string, string>; syms: Map<string, string>; symsRev: Map<string, string> };
class BudgetExceeded extends Error {}

function matchTerm(a: Term, b: Term, st: MatchState, declared: (n: string) => boolean, tick: () => void): MatchState | null {
  tick();
  if (a.kind !== b.kind) return null;
  if (a.kind === "var" && b.kind === "var") {
    const m = st.vars.get(a.name);
    const r = st.varsRev.get(b.name);
    if (m === undefined && r === undefined) {
      const vars = new Map(st.vars).set(a.name, b.name);
      const varsRev = new Map(st.varsRev).set(b.name, a.name);
      return { ...st, vars, varsRev };
    }
    return m === b.name && r === a.name ? st : null;
  }
  let cur: MatchState | null = st;
  if (a.kind === "fn" && b.kind === "fn" && a.args.length !== b.args.length) return null;
  if (declared(a.name) || declared(b.name)) {
    if (a.name !== b.name) return null;
  } else {
    const key = `${a.kind}:${a.name}/${a.kind === "fn" ? a.args.length : 0}`;
    const keyRev = `${b.kind}:${b.name}/${b.kind === "fn" ? b.args.length : 0}`;
    const m = st.syms.get(key);
    const r = st.symsRev.get(keyRev);
    if (m === undefined && r === undefined) {
      cur = { ...st, syms: new Map(st.syms).set(key, keyRev), symsRev: new Map(st.symsRev).set(keyRev, key) };
    } else if (!(m === keyRev && r === key)) return null;
  }
  if (a.kind === "fn" && b.kind === "fn")
    for (let i = 0; i < a.args.length && cur; i++) cur = matchTerm(a.args[i], b.args[i], cur, declared, tick);
  return cur;
}

function matchLiteral(a: PLiteral, b: PLiteral, st: MatchState, declared: (n: string) => boolean, tick: () => void): MatchState | null {
  if (a.negated !== b.negated || a.name !== b.name || a.args.length !== b.args.length) return null;
  let cur: MatchState | null = st;
  for (let i = 0; i < a.args.length && cur; i++) cur = matchTerm(a.args[i], b.args[i], cur, declared, tick);
  return cur;
}

function* matchClause(ca: PClause, cb: PClause, st: MatchState, declared: (n: string) => boolean, tick: () => void): Generator<MatchState> {
  const used: boolean[] = cb.map(() => false);
  function* rec(k: number, cur: MatchState): Generator<MatchState> {
    if (k === ca.length) {
      yield cur;
      return;
    }
    for (let l = 0; l < cb.length; l++) {
      if (used[l]) continue;
      const next = matchLiteral(ca[k], cb[l], cur, declared, tick);
      if (!next) continue;
      used[l] = true;
      yield* rec(k + 1, next);
      used[l] = false;
    }
  }
  yield* rec(0, { ...st, vars: new Map(), varsRev: new Map() });
}

/** Isomorfismo de conjuntos de cláusulas: true si `declared` fija los símbolos que no pueden renombrarse. */
export function isomorphicClauseSets(a: PClause[], b: PClause[], declared: (n: string) => boolean): boolean {
  if (a.length !== b.length) return false;
  let steps = 0;
  const tick = () => {
    if (++steps > MATCH_BUDGET) throw new BudgetExceeded();
  };
  const usedB: boolean[] = b.map(() => false);
  const dfs = (i: number, syms: Map<string, string>, symsRev: Map<string, string>): boolean => {
    if (i === a.length) return true;
    for (let j = 0; j < b.length; j++) {
      if (usedB[j] || a[i].length !== b[j].length) continue;
      for (const st of matchClause(a[i], b[j], { vars: new Map(), varsRev: new Map(), syms, symsRev }, declared, tick)) {
        usedB[j] = true;
        if (dfs(i + 1, st.syms, st.symsRev)) return true;
        usedB[j] = false;
      }
    }
    return false;
  };
  try {
    return dfs(0, new Map(), new Map());
  } catch (e) {
    if (e instanceof BudgetExceeded) return false;
    throw e;
  }
}

/** Dos cláusulas iguales salvo renombrado de variables (los símbolos no se renombran). */
export const isVariant = (a: PClause, b: PClause) => isomorphicClauseSets([a], [b], () => true);

/** Quita tautologías y duplicados (salvo variantes). */
export function simplifyClauseSet(cs: PClause[]): PClause[] {
  const out: PClause[] = [];
  for (const c of cs) {
    if (isTautologicalPClause(c)) continue;
    if (out.some(o => isVariant(o, c))) continue;
    out.push(normalizePClause(c));
  }
  return out;
}

// ---------------------------------------------------------------- parseo

class ParseFailure extends Error {
  constructor(readonly failure: ClauseFailure) {
    super(failure.message);
  }
}
const fail = (code: string, message: string, params: MessageParams = {}): never => {
  throw new ParseFailure({ messageCode: code as MessageCode, messageParams: params, message });
};

export type PClauseParse = { ok: true; clause: PClause } | { ok: false; error: ClauseFailure };
export type PClauseSetParse = { ok: true; clauses: PClause[] } | { ok: false; error: ClauseFailure };

type ParseCtx = { sym: ClauseSymbols; freeArity: Map<string, number> };

const identToken = /^[A-Za-z][A-Za-z0-9_]*'*/;

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let rest = text.trim();
  while (rest) {
    const m = identToken.exec(rest);
    if (m) {
      tokens.push(m[0]);
      rest = rest.slice(m[0].length).trimStart();
    } else if ("(),".includes(rest[0])) {
      tokens.push(rest[0]);
      rest = rest.slice(1).trimStart();
    } else fail("resolution.badLiteral", `El literal «${text.trim()}» no es válido: usa un predicado, con su negación opcional (¬P(x)).`, { value: text.trim() });
  }
  return tokens;
}

export function isVariableName(name: string, sym: ClauseSymbols): boolean {
  return sym.variables.some(v => name.startsWith(v) && /^[0-9']*$/.test(name.slice(v.length)));
}

function parseLiteralText(text: string, ctx: ParseCtx): PLiteral {
  const t = text.trim();
  const m = /^([¬~!]?)\s*([\s\S]*)$/.exec(t)!;
  const tokens = tokenize(m[2]);
  const bad = () => fail("resolution.badLiteral", `El literal «${t}» no es válido: usa un predicado, con su negación opcional (¬P(x)).`, { value: t });
  const { sym } = ctx;
  let index = 0;
  const listSymbols = () => [...Object.keys(sym.predicates), ...sym.constants, ...Object.keys(sym.functions), ...sym.variables].join(", ");
  const arityError = (name: string, expected: number, found: number) =>
    fail("resolution.arityMismatch", `«${name}» tiene aridad ${expected} pero se usa con ${found} argumento(s).`, { name, expected, found });

  function args(): Term[] {
    index++; // "("
    const out: Term[] = [];
    if (tokens[index] === ")") return bad();
    for (;;) {
      out.push(term());
      if (tokens[index] === ",") {
        index++;
        continue;
      }
      break;
    }
    if (tokens[index] !== ")") return bad();
    index++;
    return out;
  }
  function term(): Term {
    const name = tokens[index++];
    if (name === undefined || !identToken.test(name)) return bad();
    const hasArgs = tokens[index] === "(";
    if (name in sym.predicates) return fail("resolution.symbolMisuse", `«${name}» es un predicado, no un término.`, { value: name });
    if (hasArgs) {
      if (name in sym.functions) {
        const list = args();
        if (list.length !== sym.functions[name]) return arityError(name, sym.functions[name], list.length);
        return { kind: "fn", name, args: list };
      }
      if (sym.constants.includes(name) || isVariableName(name, sym))
        return fail("resolution.symbolMisuse", `«${name}» no es una función.`, { value: name });
      if (!sym.free) return fail("resolution.unknownSymbol", `El símbolo «${name}» no está declarado. Símbolos disponibles: ${listSymbols()}.`, { value1: name, value2: listSymbols() });
      const list = args();
      const known = ctx.freeArity.get(name);
      if (known !== undefined && known !== list.length) return arityError(name, known, list.length);
      ctx.freeArity.set(name, list.length);
      return { kind: "fn", name, args: list };
    }
    if (name in sym.functions) return arityError(name, sym.functions[name], 0);
    if (sym.constants.includes(name)) return { kind: "const", name };
    if (isVariableName(name, sym)) return { kind: "var", name };
    if (!sym.free) return fail("resolution.unknownSymbol", `El símbolo «${name}» no está declarado. Símbolos disponibles: ${listSymbols()}.`, { value1: name, value2: listSymbols() });
    const known = ctx.freeArity.get(name);
    if (known !== undefined && known !== 0) return arityError(name, known, 0);
    ctx.freeArity.set(name, 0);
    return { kind: "const", name };
  }

  const name = tokens[index++];
  if (name === undefined || !identToken.test(name)) return bad();
  if (!(name in sym.predicates)) {
    if (sym.constants.includes(name) || name in sym.functions || isVariableName(name, sym))
      return fail("resolution.symbolMisuse", `«${name}» no es un predicado.`, { value: name });
    return fail("resolution.unknownPredicate", `El predicado «${name}» no está declarado. Símbolos disponibles: ${listSymbols()}.`, { value1: name, value2: listSymbols() });
  }
  const arity = sym.predicates[name];
  let list: Term[] = [];
  if (tokens[index] === "(") list = args();
  else if (arity !== 0) return arityError(name, arity, 0);
  if (index !== tokens.length) return bad();
  if (list.length !== arity) return arityError(name, arity, list.length);
  for (const a of list) if (termDepth(a) > MAX_TERM_DEPTH) return fail("resolution.termTooDeep", `Los términos admiten como máximo ${MAX_TERM_DEPTH} niveles de anidación.`, { max: MAX_TERM_DEPTH });
  return { negated: m[1] !== "", name, args: list };
}

/** Divide en el nivel exterior (fuera de paréntesis y, opcionalmente, de llaves). */
function splitTop(text: string, isSep: (ch: string) => boolean, braces: boolean): string[] | undefined {
  const items: string[] = [];
  let paren = 0;
  let brace = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") paren++;
    if (ch === ")") paren--;
    if (braces && ch === "{") brace++;
    if (braces && ch === "}") brace--;
    if (paren < 0 || brace < 0) return undefined;
    if (paren === 0 && brace === 0 && isSep(ch)) {
      items.push(current);
      current = "";
    } else current += ch;
  }
  if (paren !== 0 || brace !== 0) return undefined;
  items.push(current);
  return items.map(i => i.trim());
}

function parseClauseIn(text: string, ctx: ParseCtx): PClause {
  let t = text.trim();
  if (!t) return fail("resolution.clauseRequired", "Escribe una cláusula para continuar.");
  if (["□", "[]", "⊥"].includes(t)) return [];
  let parts: string[] | undefined;
  if (t.startsWith("{") || t.endsWith("}")) {
    if (!(t.startsWith("{") && t.endsWith("}") && t.indexOf("{", 1) < 0 && t.indexOf("}") === t.length - 1))
      return fail("resolution.badClause", `La cláusula «${t}» está mal formada: usa llaves como {P(x), ¬Q(x)}.`, { value: t });
    t = t.slice(1, -1).trim();
    parts = t ? splitTop(t, ch => ch === ",", false) : [];
  } else parts = splitTop(t, ch => ch === "∨" || ch === "|", false);
  if (!parts) return fail("resolution.badClause", `La cláusula «${text.trim()}» está mal formada: los paréntesis no están bien emparejados.`, { value: text.trim() });
  if (parts.length > MAX_CLAUSE_LITERALS)
    return fail("resolution.tooManyLiterals", `Una cláusula admite como máximo ${MAX_CLAUSE_LITERALS} literales.`, { max: MAX_CLAUSE_LITERALS });
  return normalizePClause(parts.map(p => parseLiteralText(p, ctx)));
}

function guard<T>(run: () => T): { ok: true; value: T } | { ok: false; error: ClauseFailure } {
  try {
    return { ok: true, value: run() };
  } catch (e) {
    if (e instanceof ParseFailure) return { ok: false, error: e.failure };
    throw e;
  }
}

export function parsePClause(text: string, sym: ClauseSymbols): PClauseParse {
  if (text.length > MAX_ANSWER_LENGTH) return { ok: false, error: { messageCode: "resolution.tooLong" as MessageCode, messageParams: {}, message: "La respuesta es demasiado larga." } };
  const r = guard(() => parseClauseIn(text, { sym, freeArity: new Map() }));
  return r.ok ? { ok: true, clause: r.value } : r;
}

export function parsePClauseSet(text: string, sym: ClauseSymbols): PClauseSetParse {
  if (text.length > MAX_ANSWER_LENGTH) return { ok: false, error: { messageCode: "resolution.tooLong" as MessageCode, messageParams: {}, message: "La respuesta es demasiado larga." } };
  const r = guard(() => {
    let t = text.trim();
    if (!t) return fail("resolution.clauseRequired", "Escribe las cláusulas para continuar.");
    if (t === "∅") return [] as PClause[];
    if (t.startsWith("{") && t.endsWith("}") && t.indexOf("{", 1) >= 0) {
      const inner = t.slice(1, -1);
      const items = splitTop(inner, ch => ch === "," || ch === ";" || ch === "\n" || ch === "\r", true)?.filter(i => i);
      if (items && items.length && items.every(i => i === "□" || (i.startsWith("{") && i.endsWith("}")))) t = inner;
    }
    const items = splitTop(t, ch => ch === "," || ch === ";" || ch === "\n" || ch === "\r", true);
    if (!items) return fail("resolution.badClause", "Las llaves o paréntesis no están bien emparejados.", { value: t });
    const nonEmpty = items.filter(i => i);
    if (!nonEmpty.length) return fail("resolution.clauseRequired", "Escribe las cláusulas para continuar.");
    if (nonEmpty.length > MAX_CLAUSES)
      return fail("resolution.tooManyClauses", `Hay demasiadas cláusulas (máximo ${MAX_CLAUSES}).`, { max: MAX_CLAUSES });
    const ctx: ParseCtx = { sym, freeArity: new Map() };
    const out: PClause[] = [];
    const seen = new Set<string>();
    for (const item of nonEmpty) {
      const c = parseClauseIn(item, ctx);
      const k = pClauseKey(c);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
    return out;
  });
  return r.ok ? { ok: true, clauses: r.value } : r;
}

// ---------------------------------------------------------------- forma normal negativa, prenexa, Skolem

export function toNnf(n: PNode, negate = false): PNode {
  switch (n.kind) {
    case "pred":
      return negate ? { kind: "not", value: n } : n;
    case "not":
      return toNnf(n.value, !negate);
    case "and":
    case "or":
      return { kind: negate ? (n.kind === "and" ? "or" : "and") : n.kind, left: toNnf(n.left, negate), right: toNnf(n.right, negate) };
    case "implies":
      return negate
        ? { kind: "and", left: toNnf(n.left, false), right: toNnf(n.right, true) }
        : { kind: "or", left: toNnf(n.left, true), right: toNnf(n.right, false) };
    case "iff":
      return negate
        ? { kind: "or", left: { kind: "and", left: toNnf(n.left, false), right: toNnf(n.right, true) }, right: { kind: "and", left: toNnf(n.left, true), right: toNnf(n.right, false) } }
        : { kind: "and", left: { kind: "or", left: toNnf(n.left, true), right: toNnf(n.right, false) }, right: { kind: "or", left: toNnf(n.right, true), right: toNnf(n.left, false) } };
    case "forall":
    case "exists":
      return { kind: negate ? (n.kind === "forall" ? "exists" : "forall") : n.kind, variable: n.variable, body: toNnf(n.body, negate) };
  }
}

function renameTerm(t: Term, env: Record<string, string>): Term {
  if (t.kind === "var") return Object.hasOwn(env, t.name) ? { kind: "var", name: env[t.name] } : t;
  if (t.kind === "const") return t;
  return { kind: "fn", name: t.name, args: t.args.map(a => renameTerm(a, env)) };
}

/** Renombra las variables ligadas para que cada cuantificador tenga una variable distinta. */
export function renameBoundApart(n: PNode): PNode {
  const used = new Set(freeVariables(n));
  const visit = (m: PNode, env: Record<string, string>): PNode => {
    switch (m.kind) {
      case "pred":
        return { kind: "pred", name: m.name, args: m.args.map(a => renameTerm(a, env)) };
      case "not":
        return { kind: "not", value: visit(m.value, env) };
      case "forall":
      case "exists": {
        let name = m.variable;
        for (let i = 1; used.has(name); i++) name = `${m.variable}${i}`;
        used.add(name);
        return { kind: m.kind, variable: name, body: visit(m.body, { ...env, [m.variable]: name }) };
      }
      default:
        return { kind: m.kind, left: visit(m.left, env), right: visit(m.right, env) };
    }
  };
  return visit(n, {});
}

export type Quantifier = { kind: "forall" | "exists"; variable: string };

/** Forma prenexa de una fórmula en NNF con variables ligadas distintas. */
export function prenexParts(n: PNode): { prefix: Quantifier[]; matrix: PNode } {
  switch (n.kind) {
    case "forall":
    case "exists": {
      const inner = prenexParts(n.body);
      return { prefix: [{ kind: n.kind, variable: n.variable }, ...inner.prefix], matrix: inner.matrix };
    }
    case "and":
    case "or": {
      const l = prenexParts(n.left);
      const r = prenexParts(n.right);
      return { prefix: [...l.prefix, ...r.prefix], matrix: { kind: n.kind, left: l.matrix, right: r.matrix } };
    }
    default:
      return { prefix: [], matrix: n };
  }
}

export const wrapQuantifiers = (prefix: Quantifier[], matrix: PNode): PNode =>
  prefix.reduceRight<PNode>((body, q) => ({ kind: q.kind, variable: q.variable, body }), matrix);

const preferredConstants = ["a", "b", "c", "d", "e"];
const preferredFunctions = ["f", "g", "h", "k", "m"];

export type SkolemSymbols = { constants: string[]; functions: Record<string, number> };

class SkolemNamer {
  readonly symbols: SkolemSymbols = { constants: [], functions: {} };
  private nextConstant = 0;
  private nextFunction = 0;
  constructor(private readonly taken: Set<string>) {}
  private fresh(preferred: string[], counter: "c" | "f"): string {
    const index = counter === "c" ? this.nextConstant : this.nextFunction;
    let i = index;
    let name = "";
    for (;;) {
      name = i < preferred.length ? preferred[i] : `${counter}${i - preferred.length + 1}`;
      i++;
      if (!this.taken.has(name)) break;
    }
    if (counter === "c") this.nextConstant = i;
    else this.nextFunction = i;
    this.taken.add(name);
    return name;
  }
  term(universals: string[]): Term {
    if (!universals.length) {
      const name = this.fresh(preferredConstants, "c");
      this.symbols.constants.push(name);
      return { kind: "const", name };
    }
    const name = this.fresh(preferredFunctions, "f");
    this.symbols.functions[name] = universals.length;
    return { kind: "fn", name, args: universals.map(v => ({ kind: "var", name: v }) as Term) };
  }
}

function matrixToClauses(n: PNode): PClause[] {
  const tooBig = () => new DomainError("La forma clausal es demasiado grande.", "resolution.cnfTooLarge" as MessageCode);
  const cleanup = (cs: PClause[]): PClause[] => {
    const seen = new Set<string>();
    const out: PClause[] = [];
    for (const c of cs) {
      const nc = normalizePClause(c);
      if (isTautologicalPClause(nc)) continue;
      const k = pClauseKey(nc);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(nc);
    }
    if (out.length > MAX_CNF_CLAUSES) throw tooBig();
    return out;
  };
  const cnf = (m: PNode): PClause[] => {
    switch (m.kind) {
      case "pred":
        return [[{ negated: false, name: m.name, args: m.args }]];
      case "not":
        if (m.value.kind !== "pred") throw new DomainError("Fórmula no está en forma normal negativa.", "resolution.badClause" as MessageCode);
        return [[{ negated: true, name: m.value.name, args: m.value.args }]];
      case "and":
        return cleanup([...cnf(m.left), ...cnf(m.right)]);
      case "or": {
        const a = cnf(m.left);
        const b = cnf(m.right);
        if (a.length * b.length > MAX_CNF_CLAUSES * 4) throw tooBig();
        return cleanup(a.flatMap(x => b.map(y => [...x, ...y])));
      }
      default:
        throw new DomainError("Fórmula no está en forma normal negativa.", "resolution.badClause" as MessageCode);
    }
  };
  return cnf(n);
}

export type Clausification = {
  nnf: PNode;
  /** Forma prenexa con variables ligadas distintas. */
  prenex: PNode;
  /** Prefijo universal + matriz con términos de Skolem. */
  skolemized: PNode;
  clauses: PClause[];
  symbols: SkolemSymbols;
};

/** Forma clausal de una fórmula cerrada. `taken` = nombres que los símbolos de Skolem no pueden usar. */
export function clausify(formula: PNode, taken: Set<string>, mode: "prenex" | "inner" = "prenex"): Clausification {
  const nnf = toNnf(formula);
  const renamed = renameBoundApart(nnf);
  const { prefix, matrix } = prenexParts(renamed);
  const namer = new SkolemNamer(new Set(taken));
  let body: PNode;
  let universals: Quantifier[];
  if (mode === "prenex") {
    body = matrix;
    universals = [];
    const seen: string[] = [];
    for (const q of prefix) {
      if (q.kind === "forall") {
        seen.push(q.variable);
        universals.push(q);
      } else body = substitute(body, q.variable, namer.term(seen));
    }
  } else {
    universals = [];
    const walk = (m: PNode, seen: string[]): PNode => {
      switch (m.kind) {
        case "forall":
          universals.push({ kind: "forall", variable: m.variable });
          return walk(m.body, [...seen, m.variable]);
        case "exists":
          return walk(substitute(m.body, m.variable, namer.term(seen)), seen);
        case "and":
        case "or":
          return { kind: m.kind, left: walk(m.left, seen), right: walk(m.right, seen) };
        default:
          return m;
      }
    };
    body = walk(renamed, []);
  }
  return {
    nnf,
    prenex: wrapQuantifiers(prefix, matrix),
    skolemized: wrapQuantifiers(universals, body),
    clauses: matrixToClauses(body),
    symbols: namer.symbols,
  };
}

export const formatClausification = (c: Clausification) => ({
  nnf: formatPredicateFormula(c.nnf),
  prenex: formatPredicateFormula(c.prenex),
  skolemized: formatPredicateFormula(c.skolemized),
  clauses: formatPClauseSet(c.clauses),
});

/** Cláusulas de referencia para varias fórmulas cerradas (los símbolos de Skolem no se repiten entre fórmulas). */
export function referenceClauses(formulas: PNode[], signature: PredicateSignature, mode: "prenex" | "inner"): PClause[] {
  const taken = declaredNames(signature);
  const all: PClause[] = [];
  for (const f of formulas) {
    const c = clausify(f, taken, mode);
    for (const name of [...c.symbols.constants, ...Object.keys(c.symbols.functions)]) taken.add(name);
    all.push(...c.clauses);
  }
  return simplifyClauseSet(all);
}

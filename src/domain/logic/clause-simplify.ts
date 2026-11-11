/**
 * Simplificación de conjuntos de cláusulas (fase 2 del flujo guiado de resolución), para enunciados y
 * predicados a través de `FormulaContext`.
 *
 * REPRESENTACIÓN. `AnyClauseSet` es `Clause[]` (enunciados) o `PClause[]` (predicados). Es un MULTICONJUNTO:
 * no se eliminan cláusulas repetidas al parsear ni al construirlo, porque «repetida» es una simplificación.
 * Las comparaciones son módulo orden de cláusulas y de literales y, en predicados, módulo renombrado de
 * variables (variantes: `{P(x)}` y `{P(y)}` son la misma cláusula).
 *
 * TEXTO. `{¬A, B}, {C}`; `□` cláusula vacía (también `{}`, `[]`, `⊥`); `∅` conjunto vacío. Se admiten llaves
 * exteriores, separadores `,`, `;` y salto de línea, y disyunciones sin llaves (`A ∨ ¬B`), como en clauses.ts.
 * En predicados se admiten constantes y funciones no declaradas (símbolos de Skolem, modo "free"); los
 * predicados deben estar declarados.
 *
 * SIMPLIFICACIONES (cada paso aplica UNA «acción»; `applicableSimplifications` las enumera):
 *   subsumption  eliminar una cláusula D subsumida por otra C (C ≠ D, no variante). Enunciados: C ⊆ D.
 *                Predicados: θ-subsunción simple (existe sustitución θ de las variables de C con Cθ ⊆ D;
 *                sin factorización ni condición de longitud). Acciones: quitar una cláusula subsumida, o
 *                quitar a la vez todas las subsumidas por cláusulas que se conservan.
 *   pure         eliminar cláusulas con un literal puro: el complementario no aparece en ninguna cláusula del
 *                conjunto (incluida la propia). Predicados: no aparece ningún literal de signo opuesto y
 *                mismo predicado que unifique con él (cláusula renombrada aparte). Acciones: quitar todas las
 *                cláusulas que contienen un literal puro concreto; en predicados también una sola cláusula
 *                con literal puro; y quitar a la vez todas las cláusulas con algún literal puro.
 *   tautology    eliminar una cláusula tautológica (con `l` y `¬l`; en predicados, mismo átomo sintáctico),
 *                o todas a la vez.
 *   repeated     eliminar copias repetidas (variantes): para cada grupo quitar todas las copias salvo una;
 *                o hacerlo en todos los grupos a la vez.
 *   none         «no se puede simplificar más»: correcto solo si no queda ninguna acción aplicable.
 *
 * CÓDIGOS (`errors.<código>`) de `checkSimplifyStep`:
 *   simplify.notApplicable      esa simplificación no procede en este conjunto            (kind)
 *   simplify.unchanged          el conjunto escrito es igual al anterior
 *   simplify.notSubset          el conjunto escrito contiene cláusulas que no estaban (o más copias)
 *   simplify.wrongResult        el conjunto escrito no es el resultado de aplicar esa simplificación una vez
 *   simplify.stillSimplifiable  «no se puede simplificar más» pero aún se puede simplificar
 *   simplify.badKind            tipo de simplificación desconocido                        (kind)
 * y los de parseo (se reenvían tal cual, con sus params): resolution.clauseRequired, resolution.tooLong,
 * resolution.tooManyClauses (max), resolution.tooManyLiterals (max), resolution.badLiteral (value),
 * resolution.badClause (value), unknownAtom (value1, value2), resolution.unknownPredicate,
 * resolution.unknownSymbol, resolution.symbolMisuse, resolution.arityMismatch, resolution.termTooDeep.
 */
import { DomainError } from "../errors";
import type { MessageCode, MessageParams } from "../errors";
import {
  type Clause,
  MAX_CLAUSES,
  clauseKey,
  formatClause,
  formatClauseSet,
  isTautologicalClause,
  parseClause,
  sameClause,
} from "./clauses";
import type { FormulaContext, SimplifyKind, SimplifyStep } from "./guided-types";
import { MAX_ANSWER_LENGTH } from "./limits";
import {
  type PClause,
  type PLiteral,
  formatPClause,
  formatPClauseSet,
  isTautologicalPClause,
  isVariant,
  literalKey,
  pClauseKey,
  pClauseVariables,
  parsePClause,
  renameApart,
  symbolsFromSignature,
} from "./predicate-clauses";
import { type Term, termsEqual } from "./predicates";
import { unifyAll } from "./unification";

export type AnyClauseSet = Clause[] | PClause[];
export type AnyClause = Clause | PClause;

export type ParseSetResult =
  | { ok: true; clauses: AnyClauseSet }
  | { ok: false; code: MessageCode; params?: MessageParams };
export type SimplifyApplication = { kind: SimplifyKind; result: AnyClauseSet; detail?: string };
export type SimplifyCheck =
  | { ok: true; after: AnyClauseSet }
  | { ok: false; code: MessageCode; params?: MessageParams };

const SUBSUMPTION_BUDGET = 100_000;

const isPredicate = (ctx: FormulaContext) => ctx.language === "predicate";
const props = (set: AnyClauseSet) => set as Clause[];
const preds = (set: AnyClauseSet) => set as PClause[];
const all = (set: AnyClauseSet): AnyClause[] => set as AnyClause[];

// ---------------------------------------------------------------- texto

export const formatClauseText = (ctx: FormulaContext, c: AnyClause): string =>
  isPredicate(ctx) ? formatPClause(c as PClause) : formatClause(c as Clause);

export const formatClauseSetText = (ctx: FormulaContext, set: AnyClauseSet): string =>
  isPredicate(ctx) ? formatPClauseSet(preds(set)) : formatClauseSet(props(set));

export const clauseTexts = (ctx: FormulaContext, set: AnyClauseSet): string[] => all(set).map(c => formatClauseText(ctx, c));

export const isEmptyAnyClause = (c: AnyClause) => c.length === 0;

/** Parsea UNA cláusula (texto `{¬A, B}`, `□`, ...). */
export function parseClauseText(
  ctx: FormulaContext,
  text: string,
): { ok: true; clause: AnyClause } | { ok: false; code: MessageCode; params?: MessageParams } {
  if (ctx.language === "propositional") {
    const r = parseClause(text, ctx.atoms);
    return r.ok ? { ok: true, clause: r.clause } : { ok: false, code: r.error.messageCode, params: r.error.messageParams };
  }
  const r = parsePClause(text, symbolsFromSignature(ctx.signature, true));
  return r.ok ? { ok: true, clause: r.clause } : { ok: false, code: r.error.messageCode, params: r.error.messageParams };
}

/** Divide en el nivel exterior (fuera de llaves y paréntesis) por `,`, `;` y saltos de línea. */
function splitTopLevel(text: string): string[] | undefined {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "{" || ch === "(") depth++;
    if (ch === "}" || ch === ")") depth--;
    if (depth < 0) return undefined;
    if (depth === 0 && (ch === "," || ch === ";" || ch === "\n" || ch === "\r")) {
      items.push(current);
      current = "";
    } else current += ch;
  }
  if (depth !== 0) return undefined;
  items.push(current);
  return items.map(i => i.trim());
}

/** Parsea un conjunto de cláusulas sin eliminar repetidas. */
export function parseClauseSetText(ctx: FormulaContext, text: string): ParseSetResult {
  if (text.length > MAX_ANSWER_LENGTH) return { ok: false, code: "resolution.tooLong" };
  let t = text.trim();
  if (!t) return { ok: false, code: "resolution.clauseRequired" };
  if (t === "∅") return { ok: true, clauses: [] };
  if (t.startsWith("{") && t.endsWith("}") && t.indexOf("{", 1) >= 0) {
    const inner = t.slice(1, -1);
    const items = splitTopLevel(inner)?.filter(i => i);
    if (items && items.length && items.every(i => i === "□" || (i.startsWith("{") && i.endsWith("}")))) t = inner;
  }
  const split = splitTopLevel(t);
  if (!split) return { ok: false, code: "resolution.badClause", params: { value: t } };
  const items = split.filter(i => i);
  if (!items.length) return { ok: false, code: "resolution.clauseRequired" };
  if (items.length > MAX_CLAUSES) return { ok: false, code: "resolution.tooManyClauses", params: { max: MAX_CLAUSES } };
  const out: AnyClause[] = [];
  for (const item of items) {
    const r = parseClauseText(ctx, item);
    if (!r.ok) return r;
    out.push(r.clause);
  }
  return { ok: true, clauses: out as AnyClauseSet };
}

/** Construye un conjunto a partir de textos de cláusula (datos del sistema). Lanza DomainError si alguno no parsea. */
export function setFromClauseTexts(ctx: FormulaContext, texts: string[]): AnyClauseSet {
  const out: AnyClause[] = [];
  for (const text of texts) {
    const r = parseClauseText(ctx, text);
    if (!r.ok) throw new DomainError(`Cláusula no válida: ${text}`, r.code, r.params ?? {});
    out.push(r.clause);
  }
  return out as AnyClauseSet;
}

// ---------------------------------------------------------------- comparación

/** Cláusulas iguales (enunciados: mismos literales; predicados: variantes). */
export const sameAnyClause = (ctx: FormulaContext, a: AnyClause, b: AnyClause): boolean =>
  isPredicate(ctx) ? isVariant(a as PClause, b as PClause) : sameClause(a as Clause, b as Clause);

const setKey = (ctx: FormulaContext, set: AnyClauseSet): string =>
  all(set)
    .map(c => (isPredicate(ctx) ? pClauseKey(c as PClause) : clauseKey(c as Clause)))
    .sort()
    .join(" | ");

/** Empareja cada cláusula de `a` con una distinta de `b` (variante); true si todas lo consiguen. */
function embeds(ctx: FormulaContext, a: AnyClauseSet, b: AnyClauseSet): boolean {
  const used = all(b).map(() => false);
  return all(a).every(c => {
    const j = all(b).findIndex((d, k) => !used[k] && sameAnyClause(ctx, c, d));
    if (j < 0) return false;
    used[j] = true;
    return true;
  });
}

/** Igualdad de multiconjuntos de cláusulas, módulo orden (y variantes en predicados). */
export const sameClauseSets = (ctx: FormulaContext, a: AnyClauseSet, b: AnyClauseSet): boolean =>
  a.length === b.length && embeds(ctx, a, b);

// ---------------------------------------------------------------- subsunción

function matchOneWay(p: Term, t: Term, theta: Map<string, Term>): Map<string, Term> | null {
  if (p.kind === "var") {
    const bound = theta.get(p.name);
    if (bound) return termsEqual(bound, t) ? theta : null;
    return new Map(theta).set(p.name, t);
  }
  if (p.kind !== t.kind || p.name !== t.name) return null;
  if (p.kind === "fn" && t.kind === "fn") {
    if (p.args.length !== t.args.length) return null;
    let cur: Map<string, Term> | null = theta;
    for (let i = 0; i < p.args.length && cur; i++) cur = matchOneWay(p.args[i], t.args[i], cur);
    return cur;
  }
  return theta;
}

function matchLiteralOneWay(l: PLiteral, m: PLiteral, theta: Map<string, Term>): Map<string, Term> | null {
  if (l.negated !== m.negated || l.name !== m.name || l.args.length !== m.args.length) return null;
  let cur: Map<string, Term> | null = theta;
  for (let i = 0; i < l.args.length && cur; i++) cur = matchOneWay(l.args[i], m.args[i], cur);
  return cur;
}

/** θ-subsunción simple: existe θ (sobre las variables de `c`) con cθ ⊆ d. */
export function thetaSubsumes(c: PClause, d: PClause): boolean {
  let steps = 0;
  const rec = (i: number, theta: Map<string, Term>): boolean => {
    if (i === c.length) return true;
    for (const m of d) {
      if (++steps > SUBSUMPTION_BUDGET) return false;
      const next = matchLiteralOneWay(c[i], m, theta);
      if (next && rec(i + 1, next)) return true;
    }
    return false;
  };
  return rec(0, new Map());
}

/** `c` subsume a `d` (c ≠ d como cláusulas: no variantes). */
export function subsumes(ctx: FormulaContext, c: AnyClause, d: AnyClause): boolean {
  if (sameAnyClause(ctx, c, d)) return false;
  if (isPredicate(ctx)) return thetaSubsumes(c as PClause, d as PClause);
  return (c as Clause).every(l => (d as Clause).some(m => m.atom === l.atom && m.negated === l.negated));
}

// ---------------------------------------------------------------- literales puros

function isPureLiteral(ctx: FormulaContext, set: AnyClauseSet, ci: number, li: number): boolean {
  if (!isPredicate(ctx)) {
    const l = props(set)[ci][li];
    return !props(set).some(c => c.some(m => m.atom === l.atom && m.negated !== l.negated));
  }
  const clause = preds(set)[ci];
  const l = clause[li];
  const avoid = pClauseVariables(clause);
  return !preds(set).some(other => {
    const renamed = renameApart(other, avoid);
    return renamed.some(m => {
      if (m.negated === l.negated || m.name !== l.name || m.args.length !== l.args.length) return false;
      return unifyAll(l.args.map((t, i) => [t, m.args[i]] as [Term, Term])).ok;
    });
  });
}

/** Índices de literal puro de cada cláusula. */
function pureLiterals(ctx: FormulaContext, set: AnyClauseSet): number[][] {
  return all(set).map((c, ci) => c.map((_, li) => li).filter(li => isPureLiteral(ctx, set, ci, li)));
}

// ---------------------------------------------------------------- aplicables

const literalKeyAny = (ctx: FormulaContext, c: AnyClause, li: number): string =>
  isPredicate(ctx) ? literalKey((c as PClause)[li]) : ((c as Clause)[li].negated ? "-" : "+") + (c as Clause)[li].atom;

type Removal = { remove: number[]; detail?: string };

function removals(ctx: FormulaContext, set: AnyClauseSet, kind: Exclude<SimplifyKind, "none">): Removal[] {
  const clauses = all(set);
  const text = (idx: number[]) => idx.map(i => formatClauseText(ctx, clauses[i])).join(", ");
  const out: Removal[] = [];
  const add = (remove: number[]) => {
    if (remove.length) out.push({ remove: [...new Set(remove)].sort((a, b) => a - b), detail: text(remove) });
  };
  if (kind === "tautology") {
    const taut = clauses.map((_, i) => i).filter(i => (isPredicate(ctx) ? isTautologicalPClause(clauses[i] as PClause) : isTautologicalClause(clauses[i] as Clause)));
    taut.forEach(i => add([i]));
    if (taut.length > 1) add(taut);
  } else if (kind === "repeated") {
    const groups: number[][] = [];
    const seen = new Set<number>();
    clauses.forEach((c, i) => {
      if (seen.has(i)) return;
      const group = [i];
      for (let j = i + 1; j < clauses.length; j++)
        if (!seen.has(j) && sameAnyClause(ctx, c, clauses[j])) {
          group.push(j);
          seen.add(j);
        }
      if (group.length > 1) groups.push(group.slice(1));
    });
    groups.forEach(g => add(g));
    if (groups.length > 1) add(groups.flat());
  } else if (kind === "subsumption") {
    const subsumedBy = (d: number, removed: Set<number>) =>
      clauses.some((c, i) => i !== d && !removed.has(i) && subsumes(ctx, c, clauses[d]));
    clauses.forEach((_, d) => {
      if (subsumedBy(d, new Set())) add([d]);
    });
    const removed = new Set<number>();
    clauses.forEach((_, d) => {
      if (subsumedBy(d, removed)) removed.add(d);
    });
    if (removed.size > 1) add([...removed]);
  } else {
    const pure = pureLiterals(ctx, set);
    const byLiteral = new Map<string, number[]>();
    pure.forEach((lits, ci) => {
      for (const li of lits) {
        const k = literalKeyAny(ctx, clauses[ci], li);
        byLiteral.set(k, [...(byLiteral.get(k) ?? []), ci]);
      }
    });
    for (const idx of byLiteral.values()) {
      // Todas las cláusulas que contienen ese literal (puro en alguna de ellas, luego en todas: es el mismo literal).
      add(idx);
    }
    if (isPredicate(ctx)) pure.forEach((lits, ci) => lits.length && add([ci]));
    const withPure = pure.map((lits, ci) => (lits.length ? ci : -1)).filter(i => i >= 0);
    if (withPure.length > 1) add(withPure);
  }
  return out;
}

/** Todas las simplificaciones aplicables, cada una con un conjunto resultante distinto (dentro de su tipo). */
export function applicableSimplifications(ctx: FormulaContext, set: AnyClauseSet): SimplifyApplication[] {
  const out: SimplifyApplication[] = [];
  const kinds: Exclude<SimplifyKind, "none">[] = ["tautology", "repeated", "subsumption", "pure"];
  for (const kind of kinds) {
    const seen = new Set<string>();
    for (const r of removals(ctx, set, kind)) {
      const result = all(set).filter((_, i) => !r.remove.includes(i)) as AnyClauseSet;
      const k = setKey(ctx, result);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ kind, result, detail: r.detail });
    }
  }
  return out;
}

export const isFullySimplified = (ctx: FormulaContext, set: AnyClauseSet): boolean => applicableSimplifications(ctx, set).length === 0;

// ---------------------------------------------------------------- comprobación de un paso

const KINDS: SimplifyKind[] = ["subsumption", "pure", "tautology", "repeated", "none"];

export function checkSimplifyStep(ctx: FormulaContext, before: AnyClauseSet, step: SimplifyStep): SimplifyCheck {
  if (!KINDS.includes(step.kind)) return { ok: false, code: "simplify.badKind", params: { kind: String(step.kind) } };
  if (step.kind === "none") {
    return isFullySimplified(ctx, before) ? { ok: true, after: before } : { ok: false, code: "simplify.stillSimplifiable" };
  }
  const apps = applicableSimplifications(ctx, before).filter(a => a.kind === step.kind);
  if (!apps.length) return { ok: false, code: "simplify.notApplicable", params: { kind: step.kind } };
  const parsed = parseClauseSetText(ctx, step.result);
  if (!parsed.ok) return parsed;
  const written = parsed.clauses;
  const match = apps.find(a => sameClauseSets(ctx, a.result, written));
  if (match) return { ok: true, after: match.result };
  if (sameClauseSets(ctx, before, written)) return { ok: false, code: "simplify.unchanged" };
  if (!embeds(ctx, written, before)) return { ok: false, code: "simplify.notSubset" };
  return { ok: false, code: "simplify.wrongResult" };
}

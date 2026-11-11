/**
 * Árbol de resolución lineal (fase 3 del flujo guiado de resolución), para enunciados y predicados a través
 * de `FormulaContext`.
 *
 * CLÁUSULAS DISPONIBLES: se numeran desde 0: primero las del conjunto de partida (en su orden), luego los
 * resolventes en orden de creación. Cada `TreeStep` elige `trunk` y `side` (índices), y un literal de cada una
 * como texto (`B`, `¬A`, `P(x)`; los literales se comparan tal como se muestran en la cláusula). El sistema
 * calcula el resolvente y lo añade a las disponibles. Se termina al alcanzar la cláusula vacía □.
 *
 * ENUNCIADOS: los literales deben ser complementarios (mismo átomo, signo opuesto). Resolvente =
 * (troncal \ {l}) ∪ (lateral \ {¬l}), normalizado. Se permiten resolventes tautológicos.
 *
 * PREDICADOS: la lateral se renombra aparte de la troncal (x pasa a x', x'', ...; también si troncal y lateral
 * son la misma cláusula), se calcula el unificador más general θ de los argumentos de los dos literales (mismo
 * predicado, signo opuesto) con occurs-check, y el resolvente es ((troncal \ {l}) ∪ (lateral' \ {l'}))θ,
 * normalizado (los literales idénticos tras θ se colapsan: factorización implícita). `substitution` es θ con
 * las variables ya renombradas (`{x/a, y'/x}`; `{}` si es la identidad). Se rechazan resolventes con términos
 * de profundidad > MAX_TERM_DEPTH.
 *
 * `checkTree` evalúa cada paso con las cláusulas acumuladas; tras un paso erróneo los siguientes se marcan
 * `tree.notEvaluated`; tras alcanzar □ cualquier paso adicional es `tree.alreadyFinished`; más de
 * MAX_TREE_STEPS pasos: `tree.tooManySteps`. `reachedEmpty` es true si □ está entre las disponibles.
 *
 * CÓDIGOS (`errors.<código>`; los mensajes no revelan la elección correcta):
 *   tree.trunkOutOfRange    índice de troncal inexistente        (count: nº de cláusulas disponibles)
 *   tree.sideOutOfRange     índice de lateral inexistente        (count)
 *   tree.literalRequired    literal vacío                        (which: "trunk" | "side")
 *   tree.badLiteral         literal ilegible o con símbolos no declarados (which, value)
 *   tree.literalNotInClause el literal no está en esa cláusula   (which, value: literal)
 *   tree.notComplementary   los literales no son complementarios (a, b: literales)
 *   tree.notUnifiable       no unifican (símbolos distintos)     (a, b)
 *   tree.occursCheck        no unifican: occurs-check            (a, b, variable)
 *   tree.resolventTooDeep   resolvente con términos demasiado profundos (max)
 *   tree.notEvaluated       paso no evaluable por un error anterior
 *   tree.alreadyFinished    paso posterior a haber alcanzado □
 *   tree.tooManySteps       demasiados pasos                     (max)
 */
import type { MessageCode, MessageParams } from "../errors";
import { type Clause, formatLiteral, isSatisfiableClauses, normalizeClause } from "./clauses";
import {
  type AnyClause,
  type AnyClauseSet,
  clauseTexts,
  formatClauseText,
  parseClauseText,
} from "./clause-simplify";
import type { FormulaContext, TreeStep, TreeStepResult } from "./guided-types";
import {
  type PClause,
  type PLiteral,
  MAX_TERM_DEPTH,
  applyToClause,
  clauseDepth,
  formatPLiteral,
  formatSubst,
  literalKey,
  pClauseVariables,
  renameApart,
} from "./predicate-clauses";
import type { Term } from "./predicates";
import { unifyAll } from "./unification";

export const MAX_TREE_STEPS = 60;

export type TreeStepCheck =
  | { ok: true; resolvent: AnyClause; substitution?: string; resolventText: string }
  | { ok: false; code: MessageCode; params?: MessageParams };

export type TreeCheck = { results: TreeStepResult[]; available: string[]; reachedEmpty: boolean };

/** ¿Es el conjunto refutable (insatisfacible)? Solo en enunciados; en predicados lo decide el dato del ejercicio. */
export function treePossibleSemantics(ctx: FormulaContext, set: AnyClauseSet): boolean | undefined {
  if (ctx.language !== "propositional") return undefined;
  return !isSatisfiableClauses(set as Clause[], ctx.atoms);
}

type Which = "trunk" | "side";
type Failure = { ok: false; code: MessageCode; params?: MessageParams };
const fail = (code: string, params?: MessageParams): Failure => ({
  ok: false,
  code: code as MessageCode,
  ...(params ? { params } : {}),
});

function parseLiteral(ctx: FormulaContext, text: string, which: Which): { ok: true; literal: Clause[number] | PLiteral } | Failure {
  if (typeof text !== "string" || !text.trim()) return fail("tree.literalRequired", { which });
  const r = parseClauseText(ctx, text);
  if (!r.ok || r.clause.length !== 1) return fail("tree.badLiteral", { which, value: text.trim().slice(0, 60) });
  return { ok: true, literal: r.clause[0] };
}

export function checkTreeStep(ctx: FormulaContext, available: AnyClauseSet, step: TreeStep): TreeStepCheck {
  const clauses = available as AnyClause[];
  const validIndex = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < clauses.length;
  if (!validIndex(step.trunk)) return fail("tree.trunkOutOfRange", { count: clauses.length });
  if (!validIndex(step.side)) return fail("tree.sideOutOfRange", { count: clauses.length });
  const tl = parseLiteral(ctx, step.trunkLiteral, "trunk");
  if (!tl.ok) return tl;
  const sl = parseLiteral(ctx, step.sideLiteral, "side");
  if (!sl.ok) return sl;

  if (ctx.language === "propositional") {
    const trunk = clauses[step.trunk] as Clause;
    const side = clauses[step.side] as Clause;
    const a = tl.literal as Clause[number];
    const b = sl.literal as Clause[number];
    if (!trunk.some(l => l.atom === a.atom && l.negated === a.negated))
      return fail("tree.literalNotInClause", { which: "trunk", value: formatLiteral(a) });
    if (!side.some(l => l.atom === b.atom && l.negated === b.negated))
      return fail("tree.literalNotInClause", { which: "side", value: formatLiteral(b) });
    if (a.atom !== b.atom || a.negated === b.negated)
      return fail("tree.notComplementary", { a: formatLiteral(a), b: formatLiteral(b) });
    const resolvent = normalizeClause([
      ...trunk.filter(l => !(l.atom === a.atom && l.negated === a.negated)),
      ...side.filter(l => !(l.atom === b.atom && l.negated === b.negated)),
    ]);
    return { ok: true, resolvent, resolventText: formatClauseText(ctx, resolvent) };
  }

  const trunk = clauses[step.trunk] as PClause;
  const side = clauses[step.side] as PClause;
  const a = tl.literal as PLiteral;
  const b = sl.literal as PLiteral;
  const ia = trunk.findIndex(l => literalKey(l) === literalKey(a));
  if (ia < 0) return fail("tree.literalNotInClause", { which: "trunk", value: formatPLiteral(a) });
  const ib = side.findIndex(l => literalKey(l) === literalKey(b));
  if (ib < 0) return fail("tree.literalNotInClause", { which: "side", value: formatPLiteral(b) });
  const renamed = renameApart(side, pClauseVariables(trunk));
  const la = trunk[ia];
  const lb = renamed[ib];
  if (la.negated === lb.negated || la.name !== lb.name || la.args.length !== lb.args.length)
    return fail("tree.notComplementary", { a: formatPLiteral(la), b: formatPLiteral(b) });
  const u = unifyAll(la.args.map((t, i) => [t, lb.args[i]] as [Term, Term]));
  if (!u.ok) {
    const params = { a: formatPLiteral(la), b: formatPLiteral(lb) };
    return u.reason === "occurs" ? fail("tree.occursCheck", { ...params, variable: u.variable ?? "" }) : fail("tree.notUnifiable", params);
  }
  const resolvent = applyToClause([...trunk.filter((_, k) => k !== ia), ...renamed.filter((_, k) => k !== ib)], u.subst);
  if (clauseDepth(resolvent) > MAX_TERM_DEPTH) return fail("tree.resolventTooDeep", { max: MAX_TERM_DEPTH });
  return { ok: true, resolvent, substitution: formatSubst(u.subst), resolventText: formatClauseText(ctx, resolvent) };
}

export function checkTree(ctx: FormulaContext, startSet: AnyClauseSet, steps: TreeStep[]): TreeCheck {
  const available: AnyClause[] = [...(startSet as AnyClause[])];
  const results: TreeStepResult[] = [];
  let broken = false;
  steps.forEach((step, n) => {
    if (broken) {
      results.push({ ok: false, code: "tree.notEvaluated" });
      return;
    }
    if (available.some(c => c.length === 0)) {
      results.push({ ok: false, code: "tree.alreadyFinished" });
      broken = true;
      return;
    }
    if (n >= MAX_TREE_STEPS) {
      results.push({ ok: false, code: "tree.tooManySteps", params: { max: MAX_TREE_STEPS } });
      broken = true;
      return;
    }
    const r = checkTreeStep(ctx, available as AnyClauseSet, step);
    if (!r.ok) {
      results.push({ ok: false, code: r.code, ...(r.params ? { params: r.params } : {}) });
      broken = true;
      return;
    }
    available.push(r.resolvent);
    results.push({
      ok: true,
      resultText: r.resolventText,
      resolvent: r.resolventText,
      ...(r.substitution !== undefined ? { substitution: r.substitution } : {}),
    });
  });
  return {
    results,
    available: clauseTexts(ctx, available as AnyClauseSet),
    reachedEmpty: available.some(c => c.length === 0),
  };
}

/**
 * Corrector del flujo guiado de resolución (change `guided-resolution-flow`).
 *
 * Respuesta: JSON de `GuidedAnswer` (el estado vacío es ""). `evaluateGuided` calcula, fase a fase, el estado de
 * cada paso y qué fases están desbloqueadas; la respuesta solo es correcta si todo es correcto.
 *
 * Códigos propios (clave `errors.guided.<code>`):
 *   guided.notEvaluated      el paso no se evalúa porque un paso anterior es incorrecto
 *   guided.afterTerminal     hay pasos después de cerrar la fase (FNC/FNS o «no se puede simplificar más»)
 *   guided.possibleWrong     la respuesta sobre si existe árbol de resolución no es correcta
 *   guided.treeNotNeeded     se construyó un árbol aunque no es posible
 *   guided.verdictWrong      la conclusión (válido / consistentes) no es correcta
 *   guided.treeIncomplete    el árbol no llega a la cláusula vacía
 *   guided.invalidData       datos de ejercicio no válidos
 */
import { DomainError, type MessageCode, type MessageParams } from "../errors";
import type { Grade } from "./grading";
import { type AnyClauseSet, checkSimplifyStep, clauseTexts, setFromClauseTexts } from "./clause-simplify";
import {
  type ClausePhaseAnswer,
  type ClausePhaseEvaluation,
  type FormulaContext,
  type GuidedAnswer,
  type GuidedEvaluation,
  type GuidedExerciseData,
  type NormalFormStep,
  type StepResult,
  type TreeStepResult,
  emptyClausePhase,
  emptyGuidedAnswer,
} from "./guided-types";
import { MAX_ANSWER_LENGTH } from "./limits";
import type { PredicateSignature } from "./predicates";
import { checkTree, treePossibleSemantics } from "./resolution-tree";
import { checkNormalFormStep, formatRewriteFormula, normalFormToClauses, parseRewriteFormula } from "./rewrite-laws";

const code = (c: string, params?: MessageParams): StepResult => ({ ok: false, code: c as MessageCode, ...(params ? { params } : {}) });
const OK: StepResult = { ok: true };

export const serializeGuidedAnswer = (answer: GuidedAnswer): string => (isBlankAnswer(answer) ? "" : JSON.stringify(answer));

export function isBlankAnswer(a: GuidedAnswer): boolean {
  const phaseBlank = (p: ClausePhaseAnswer) => !p.simplify.length && p.possible === null && !p.tree.length;
  return a.nf.premises.every((l) => !l.length) && !a.nf.negConclusion.length && phaseBlank(a.refute) && a.valid === null && phaseBlank(a.premisesPhase) && a.consistent === null;
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
function normalizePhase(x: unknown): ClausePhaseAnswer {
  const p = isRecord(x) ? x : {};
  const simplify = Array.isArray(p.simplify) ? p.simplify.filter(isRecord).map((s) => ({ kind: String(s.kind) as never, result: String(s.result ?? "") })) : [];
  const tree = Array.isArray(p.tree)
    ? p.tree.filter(isRecord).map((t) => ({ trunk: Number(t.trunk), side: Number(t.side), trunkLiteral: String(t.trunkLiteral ?? ""), sideLiteral: String(t.sideLiteral ?? "") }))
    : [];
  return { simplify, possible: typeof p.possible === "boolean" ? p.possible : null, tree };
}
const normalizeSteps = (x: unknown): NormalFormStep[] =>
  Array.isArray(x) ? x.filter(isRecord).map((s) => ({ law: String(s.law) as never, result: String(s.result ?? "") })) : [];

/** Lee una respuesta serializada; devuelve null si está en blanco o no es JSON válido. */
export function parseGuidedAnswer(text: string): GuidedAnswer | null {
  if (!text.trim() || text.length > MAX_ANSWER_LENGTH) return null;
  try {
    const x = JSON.parse(text);
    if (!isRecord(x) || !isRecord(x.nf)) return null;
    return {
      nf: { premises: Array.isArray(x.nf.premises) ? x.nf.premises.map(normalizeSteps) : [], negConclusion: normalizeSteps(x.nf.negConclusion) },
      refute: normalizePhase(x.refute),
      valid: typeof x.valid === "boolean" ? x.valid : null,
      premisesPhase: normalizePhase(x.premisesPhase),
      consistent: typeof x.consistent === "boolean" ? x.consistent : null,
    };
  } catch {
    return null;
  }
}

function toSignature(data: GuidedExerciseData): PredicateSignature {
  const sig = data.signature;
  if (!sig) throw new DomainError("Falta la signatura.", "guided.invalidData" as MessageCode);
  return {
    predicates: Object.fromEntries(sig.predicates.map((p) => [p.name, p.arity])),
    constants: sig.constants.map((c) => c.name),
    ...(sig.variables ? { variables: sig.variables } : {}),
  };
}
export function contextOf(data: GuidedExerciseData): FormulaContext {
  if (data.language === "predicate") return { language: "predicate", signature: toSignature(data) };
  return { language: "propositional", atoms: data.atoms ?? [] };
}
const withSkolem = (ctx: FormulaContext, symbols: { name: string; arity: number }[]): FormulaContext => {
  if (ctx.language !== "predicate" || !symbols.length) return ctx;
  const sig = ctx.signature;
  return {
    language: "predicate",
    signature: {
      ...sig,
      constants: [...sig.constants, ...symbols.filter((s) => s.arity === 0).map((s) => s.name)],
      functions: { ...(sig.functions ?? {}), ...Object.fromEntries(symbols.filter((s) => s.arity > 0).map((s) => [s.name, s.arity])) },
    },
  };
};

/** Fórmulas de partida: cada premisa y la negación de la conclusión. */
export function startFormulas(data: GuidedExerciseData): string[] {
  const ctx = contextOf(data);
  const canon = (t: string) => formatRewriteFormula(parseRewriteFormula(ctx, t));
  return [...data.premises.map(canon), canon(`¬(${data.conclusion})`)];
}

type NfOutcome = { results: StepResult[]; done: boolean; finalFormula?: string; skolem: { name: string; arity: number }[] };
function evaluateNormalForm(ctx: FormulaContext, start: string, steps: NormalFormStep[], known: { name: string; arity: number }[]): NfOutcome {
  const results: StepResult[] = [];
  let previous = start;
  let broken = false;
  let finished = false;
  let finalFormula: string | undefined;
  const skolem = [...known];
  for (const step of steps) {
    if (broken) { results.push(code("guided.notEvaluated")); continue; }
    if (finished) { results.push(code("guided.afterTerminal")); broken = true; continue; }
    const r = checkNormalFormStep(withSkolem(ctx, skolem), previous, step);
    if (!r.ok) { results.push({ ok: false, code: r.code, params: r.params }); broken = true; continue; }
    results.push({ ok: true, resultText: r.result });
    if (r.skolemSymbols) skolem.push(...r.skolemSymbols);
    if (step.law === "fnc" || step.law === "fns") { finished = true; finalFormula = previous; } else previous = r.result;
  }
  return { results, done: finished && !broken, finalFormula, skolem };
}

function clausesOf(ctx: FormulaContext, finals: string[]): AnyClauseSet {
  const texts = finals.flatMap((f) => normalFormToClauses(ctx, f).texts);
  return setFromClauseTexts(ctx, texts);
}

function evaluateClausePhase(ctx: FormulaContext, start: AnyClauseSet, ans: ClausePhaseAnswer, expectedPossible: boolean | undefined): ClausePhaseEvaluation {
  const simplify: StepResult[] = [];
  let current = start;
  let broken = false;
  let finished = false;
  for (const step of ans.simplify) {
    if (broken) { simplify.push(code("guided.notEvaluated")); continue; }
    if (finished) { simplify.push(code("guided.afterTerminal")); broken = true; continue; }
    const r = checkSimplifyStep(ctx, current, step);
    if (!r.ok) { simplify.push({ ok: false, code: r.code, params: r.params }); broken = true; continue; }
    current = r.after;
    simplify.push({ ok: true, resultText: clauseTexts(ctx, current).join(", ") });
    if (step.kind === "none") finished = true;
  }
  const simplified = finished && !broken;
  const finalSet = current;
  const base = { startSet: clauseTexts(ctx, start), simplify, simplified, finalSet: clauseTexts(ctx, finalSet) };
  if (!simplified) return { ...base, possible: null, tree: [], available: clauseTexts(ctx, finalSet), complete: false };
  const expected = expectedPossible ?? treePossibleSemantics(ctx, finalSet) ?? false;
  const possible: StepResult | null = ans.possible === null ? null : ans.possible === expected ? OK : code("guided.possibleWrong");
  if (!possible?.ok) return { ...base, possible, tree: [], available: clauseTexts(ctx, finalSet), complete: false };
  if (!expected) {
    const extra: TreeStepResult[] = ans.tree.map(() => code("guided.treeNotNeeded"));
    return { ...base, possible, tree: extra, available: clauseTexts(ctx, finalSet), complete: ans.tree.length === 0 };
  }
  const t = checkTree(ctx, finalSet, ans.tree);
  const complete = t.reachedEmpty && t.results.every((r) => r.ok);
  return { ...base, possible, tree: t.results, available: t.available, complete };
}

export function evaluateGuided(answer: GuidedAnswer | null, data: GuidedExerciseData): GuidedEvaluation {
  const ctx = contextOf(data);
  const n = data.premises.length;
  const a = answer ?? emptyGuidedAnswer(n);
  const starts = startFormulas(data);
  const blank = answer === null || isBlankAnswer(a);
  const outcomes: NfOutcome[] = [];
  let skolem: { name: string; arity: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const steps = i < n ? (a.nf.premises[i] ?? []) : a.nf.negConclusion;
    const o = evaluateNormalForm(ctx, starts[i], steps, skolem);
    skolem = o.skolem;
    outcomes.push(o);
  }
  const nfComplete = outcomes.every((o) => o.done);
  const nf = { premises: outcomes.slice(0, n).map((o) => o.results), negConclusion: outcomes[n].results, startFormulas: starts, complete: nfComplete };
  const empty: GuidedEvaluation = { nf, refute: null, valid: null, premisesPhase: null, consistent: null, correct: false, blank };
  if (!nfComplete) return empty;
  const fullCtx = withSkolem(ctx, skolem);
  const finals = outcomes.map((o) => o.finalFormula as string);
  const refuteStart = clausesOf(fullCtx, finals);
  const refute = evaluateClausePhase(fullCtx, refuteStart, a.refute, data.language === "predicate" ? data.valid : undefined);
  const expectedValid = data.language === "predicate" ? Boolean(data.valid) : refute.simplified ? treePossibleSemantics(fullCtx, setFromClauseTexts(fullCtx, refute.finalSet)) : undefined;
  if (!refute.complete) return { ...empty, refute };
  const valid: StepResult | null = a.valid === null ? null : a.valid === expectedValid ? OK : code("guided.verdictWrong");
  if (!valid?.ok) return { ...empty, refute, valid };
  const premStart = clausesOf(fullCtx, finals.slice(0, n));
  const premisesPhase = evaluateClausePhase(fullCtx, premStart, a.premisesPhase, data.language === "predicate" ? !data.consistent : undefined);
  if (!premisesPhase.complete) return { ...empty, refute, valid, premisesPhase };
  const expectedConsistent = data.language === "predicate" ? Boolean(data.consistent) : !treePossibleSemantics(fullCtx, setFromClauseTexts(fullCtx, premisesPhase.finalSet));
  const consistent: StepResult | null = a.consistent === null ? null : a.consistent === expectedConsistent ? OK : code("guided.verdictWrong");
  return { nf, refute, valid, premisesPhase, consistent, correct: Boolean(consistent?.ok), blank };
}

/** Resumen plano de errores para `Grade.details`: fase, índice y código del primer fallo de cada lista. */
export function firstProblem(ev: GuidedEvaluation): { phase: string; index: number; result: StepResult } | null {
  const scan = (phase: string, list: StepResult[]) => {
    const i = list.findIndex((r) => !r.ok);
    return i >= 0 ? { phase, index: i, result: list[i] } : null;
  };
  for (const [i, list] of ev.nf.premises.entries()) {
    const f = scan(`nf.${i}`, list);
    if (f) return f;
  }
  const f0 = scan("nf.conclusion", ev.nf.negConclusion);
  if (f0) return f0;
  const phases: [string, ClausePhaseEvaluation | null, StepResult | null][] = [["refute", ev.refute, ev.valid], ["premises", ev.premisesPhase, ev.consistent]];
  for (const [name, p, verdict] of phases) {
    if (!p) return null;
    const f = scan(`${name}.simplify`, p.simplify) ?? (p.possible && !p.possible.ok ? { phase: `${name}.possible`, index: 0, result: p.possible } : null) ?? scan(`${name}.tree`, p.tree);
    if (f) return f;
    if (verdict && !verdict.ok) return { phase: `${name}.verdict`, index: 0, result: verdict };
  }
  return null;
}

export type GuidedGrade = Grade;
export { emptyClausePhase };

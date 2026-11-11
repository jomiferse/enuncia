/**
 * Sistema de fórmulas de predicados para el comprobador de deducción natural.
 *
 * Igualdad módulo renombrado de variables ligadas (α). Los términos de ∀E/∃I/∀I/∃E se
 * deducen comparando la fórmula citada con el resultado (no se escriben en la línea).
 */
import type { FormulaSystem, FormulaView, InstanceMatch } from "./deduction";
import {
  alphaEquivalent,
  formatPredicateFormula,
  formatTerm,
  freeVariables,
  isFreeFor,
  parsePredicateFormula,
  substitute,
  substituteTerm,
  termsEqual,
  type PNode,
  type PredicateSignature,
  type Term,
} from "./predicates";

export type PredFormula = PNode | { kind: "bottom" };

const isBottom = (f: PredFormula): f is { kind: "bottom" } => f.kind === "bottom";

function subterms(n: PNode, out: Term[] = []): Term[] {
  const add = (t: Term) => {
    if (!out.some(o => termsEqual(o, t))) out.push(t);
    if (t.kind === "fn") t.args.forEach(add);
  };
  switch (n.kind) {
    case "pred":
      n.args.forEach(add);
      break;
    case "not":
      subterms(n.value, out);
      break;
    case "forall":
    case "exists":
      subterms(n.body, out);
      break;
    default:
      subterms(n.left, out);
      subterms(n.right, out);
  }
  return out;
}

/** Sustitución ingenua (sin renombrar ligadas): permite detectar el error típico de captura. */
function substituteNaive(n: PNode, variable: string, term: Term): PNode {
  switch (n.kind) {
    case "pred":
      return { kind: "pred", name: n.name, args: n.args.map(a => substituteTerm(a, variable, term)) };
    case "not":
      return { kind: "not", value: substituteNaive(n.value, variable, term) };
    case "forall":
    case "exists":
      return n.variable === variable ? n : { ...n, body: substituteNaive(n.body, variable, term) };
    default:
      return { kind: n.kind, left: substituteNaive(n.left, variable, term), right: substituteNaive(n.right, variable, term) };
  }
}

function instance(body: PredFormula, variable: string, target: PredFormula): InstanceMatch {
  if (isBottom(body) || isBottom(target)) return { status: "none" };
  if (!freeVariables(body).has(variable))
    return alphaEquivalent(body, target) ? { status: "ok", term: variable, variable, vacuous: true } : { status: "none" };
  let capture: Term | undefined;
  for (const t of subterms(target)) {
    if (isFreeFor(body, variable, t)) {
      if (alphaEquivalent(substitute(body, variable, t), target))
        return { status: "ok", term: formatTerm(t), variable: t.kind === "var" ? t.name : undefined, vacuous: false };
    } else if (alphaEquivalent(substituteNaive(body, variable, t), target) || alphaEquivalent(substitute(body, variable, t), target)) capture ??= t;
  }
  return capture ? { status: "capture", term: formatTerm(capture) } : { status: "none" };
}

export function predicateSystem(signature: PredicateSignature): FormulaSystem<PredFormula> {
  const format = (f: PredFormula) => (isBottom(f) ? "⊥" : formatPredicateFormula(f));
  return {
    parse(text) {
      const t = text.trim();
      if (t === "⊥" || t === "_|_") return { kind: "bottom" };
      return parsePredicateFormula(t, signature);
    },
    format,
    equals: (a, b) => (isBottom(a) || isBottom(b) ? isBottom(a) && isBottom(b) : alphaEquivalent(a, b)),
    view(f): FormulaView<PredFormula> {
      if (isBottom(f)) return { op: "bottom", args: [] };
      switch (f.kind) {
        case "pred":
          return { op: "atom", args: [] };
        case "not":
          return { op: "not", args: [f.value] };
        case "forall":
        case "exists":
          return { op: f.kind, args: [f.body] };
        default:
          return { op: f.kind, args: [f.left, f.right] };
      }
    },
    quant: {
      view(f) {
        if (isBottom(f) || (f.kind !== "forall" && f.kind !== "exists")) return undefined;
        return { kind: f.kind, variable: f.variable, body: f.body };
      },
      free: f => (isBottom(f) ? new Set<string>() : freeVariables(f)),
      instance,
    },
  };
}

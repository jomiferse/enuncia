/**
 * Unificación de términos (lógica de predicados) con occurs-check.
 *
 * Una sustitución es un `Record<variable, Term>`. Los resultados de `unify*` son idempotentes (ningún valor
 * contiene variables del dominio), de modo que `applySubst` basta con una pasada.
 *
 * `unifyTerms(a, b)` / `unifyAll(pares)` devuelven el unificador más general (mgu) o el motivo del fallo:
 *   - "clash":  símbolos distintos (predicado/función/constante) o distinta aridad
 *   - "occurs": una variable aparecería dentro del término con el que se intenta unificar (occurs-check)
 */
import type { Term } from "./predicates";

export type Subst = Record<string, Term>;
export type UnifyResult =
  | { ok: true; subst: Subst }
  | { ok: false; reason: "clash" | "occurs"; variable?: string };

export function applySubst(t: Term, s: Subst): Term {
  if (t.kind === "var") return Object.hasOwn(s, t.name) ? s[t.name] : t;
  if (t.kind === "const") return t;
  return { kind: "fn", name: t.name, args: t.args.map(a => applySubst(a, s)) };
}

export function termDepth(t: Term): number {
  return t.kind === "fn" ? 1 + Math.max(0, ...t.args.map(termDepth)) : 1;
}

function occurs(variable: string, t: Term): boolean {
  if (t.kind === "var") return t.name === variable;
  if (t.kind === "const") return false;
  return t.args.some(a => occurs(variable, a));
}

/** Unifica una lista de pares de términos; el resultado es idempotente. */
export function unifyAll(pairs: [Term, Term][]): UnifyResult {
  let subst: Subst = {};
  const stack: [Term, Term][] = [...pairs].reverse();
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const a = applySubst(x, subst);
    const b = applySubst(y, subst);
    if (a.kind === "var" && b.kind === "var" && a.name === b.name) continue;
    if (a.kind === "var" || b.kind === "var") {
      const [v, t] = a.kind === "var" ? [a, b] : [b as typeof a, a];
      if (occurs(v.name, t)) return { ok: false, reason: "occurs", variable: v.name };
      const single: Subst = { [v.name]: t };
      subst = Object.fromEntries(Object.entries(subst).map(([k, val]) => [k, applySubst(val, single)]));
      subst[v.name] = t;
      continue;
    }
    if (a.kind !== b.kind || a.name !== b.name) return { ok: false, reason: "clash" };
    if (a.kind === "fn" && b.kind === "fn") {
      if (a.args.length !== b.args.length) return { ok: false, reason: "clash" };
      for (let i = a.args.length - 1; i >= 0; i--) stack.push([a.args[i], b.args[i]]);
    }
  }
  return { ok: true, subst };
}

export const unifyTerms = (a: Term, b: Term): UnifyResult => unifyAll([[a, b]]);

/** True when `s` unifica todos los pares (aplicada a ambos lados da términos idénticos). */
export function unifies(pairs: [Term, Term][], s: Subst): boolean {
  const eq = (a: Term, b: Term): boolean =>
    a.kind === b.kind &&
    a.name === b.name &&
    (a.kind !== "fn" || (b.kind === "fn" && a.args.length === b.args.length && a.args.every((x, i) => eq(x, b.args[i]))));
  return pairs.every(([a, b]) => eq(applySubst(a, s), applySubst(b, s)));
}

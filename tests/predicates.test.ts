import assert from "node:assert/strict";
import { test } from "node:test";
import { DomainError } from "../src/domain/errors.ts";
import blocks from "../src/data/content/blocks.json" with { type: "json" };
import exercises from "../src/data/content/predicados-formulas-enunciados.json" with { type: "json" };
import { exerciseTypes } from "../src/domain/exercises/registry.ts";
import { validateCatalog } from "../src/domain/exercises/validation.ts";
import {
  alphaEquivalent,
  boundVariables,
  formatPredicateFormula,
  formulasEqual,
  freeVariables,
  isClosed,
  isFreeFor,
  parsePredicateFormula,
  substitute,
  type PredicateSignature,
} from "../src/domain/logic/predicates.ts";
import type { Block, Exercise } from "../src/domain/models.ts";

const sig: PredicateSignature = { predicates: { P: 1, Q: 1, R: 2, K: 0 }, constants: ["a", "b"] };
const parse = (s: string, g = sig) => parsePredicateFormula(s, g);
const code = (s: string, g = sig) => {
  try { parse(s, g); } catch (e) { return (e as DomainError).code; }
};

test("predicate parser accepts quantified formulas and normalizes them", () => {
  assert.equal(formatPredicateFormula(parse("∀x (P(x) → ∃y R(x, y))")), "∀x (P(x) → ∃y R(x, y))");
  assert.equal(formatPredicateFormula(parse("forall x (P(x) -> exists y R(x,y))")), "∀x (P(x) → ∃y R(x, y))");
  assert.equal(formatPredicateFormula(parse("~P(a) & !Q(b) | K")), "((¬P(a) ∧ ¬Q(b)) ∨ K)".slice(1, -1));
  assert.equal(formatPredicateFormula(parse("∀x P(x) <-> Q(a)")), "∀x P(x) ↔ Q(a)");
});
test("quantifiers bind tighter than binary connectives", () => {
  const n = parse("∀x P(x) → Q(a)");
  assert.equal(n.kind, "implies");
  assert.equal(parse("∀x (P(x) → Q(a))").kind, "forall");
});
test("predicate parser rejects wrong arity, undeclared symbols and bad syntax", () => {
  assert.equal(code("R(a)"), "predicates.arityMismatch");
  assert.equal(code("P(a, b)"), "predicates.arityMismatch");
  assert.equal(code("P"), "predicates.arityMismatch");
  assert.equal(code("S(a)"), "predicates.unknownPredicate");
  assert.equal(code("P(c)"), "predicates.unknownSymbol");
  assert.equal(code("P(Q)"), "predicates.predicateAsTerm");
  assert.equal(code("a"), "predicates.termAsFormula");
  assert.equal(code("∀k P(k)"), "predicates.undeclaredVariable");
  assert.equal(code("A x P(x)"), "predicates.unknownPredicate");
  assert.equal(code("∀ (P(x))"), "predicates.expectedVariable");
  assert.equal(code("P()"), "predicates.expectedTerm");
  assert.equal(code("P(x"), "missingClosingParenthesis");
  assert.equal(code("P(x) → Q(x) → K"), "ambiguousRelations");
  assert.equal(code("P(x) $"), "unrecognizedSymbol");
  assert.equal(code(""), "formulaRequired");
  assert.equal(code("P(x) P(y)"), "unexpectedElement");
  assert.equal(code("(".repeat(100) + "K" + ")".repeat(100)), "tooDeep");
  assert.equal(code("x".repeat(1001)), "formulaTooLong");
  assert.equal(code("K∧".repeat(160) + "K"), "tooManyTokens");
  assert.equal(code("K", { predicates: { K: 0 }, constants: ["K"] }), "predicates.invalidSignature");
});
test("function terms parse when the signature declares them", () => {
  const withF: PredicateSignature = { ...sig, functions: { f: 1 } };
  const n = parse("∀x P(f(x))", withF);
  assert.equal(formatPredicateFormula(n), "∀x P(f(x))");
  assert.equal(code("P(f)", withF), "predicates.functionArityMismatch");
  assert.equal(code("P(f(x, y))", withF), "predicates.functionArityMismatch");
  assert.equal(code("P(f(x))"), "predicates.unknownSymbol");
});
test("free and bound variables, closure", () => {
  const n = parse("∀x (P(x) → R(x, y))");
  assert.deepEqual([...freeVariables(n)], ["y"]);
  assert.deepEqual([...boundVariables(n)], ["x"]);
  assert.equal(isClosed(n), false);
  assert.equal(isClosed(parse("∃y ∀x R(x, y)")), true);
  assert.deepEqual([...freeVariables(parse("P(x) ∧ ∃x Q(x)"))], ["x"]);
});
test("substitution replaces free occurrences and avoids capture", () => {
  const a = { kind: "const", name: "a" } as const;
  assert.equal(formatPredicateFormula(substitute(parse("P(x) ∧ ∃x Q(x)"), "x", a)), "P(a) ∧ ∃x Q(x)");
  const captured = substitute(parse("∃y R(x, y)"), "x", { kind: "var", name: "y" });
  assert.equal(formatPredicateFormula(captured), "∃y1 R(y, y1)");
  assert.equal(isFreeFor(parse("∃y R(x, y)"), "x", { kind: "var", name: "y" }), false);
  assert.equal(isFreeFor(parse("∃y R(x, y)"), "x", a), true);
  assert.equal(isFreeFor(parse("∃x R(x, y)"), "x", { kind: "var", name: "y" }), true);
});
test("structural and alpha equality", () => {
  assert.equal(formulasEqual(parse("∀x P(x)"), parse("∀x P(x)")), true);
  assert.equal(formulasEqual(parse("∀x P(x)"), parse("∀y P(y)")), false);
  assert.equal(alphaEquivalent(parse("∀x ∃y R(x, y)"), parse("∀y ∃x R(y, x)")), true);
  assert.equal(alphaEquivalent(parse("∀x ∃y R(x, y)"), parse("∀x ∃y R(y, x)")), false);
  assert.equal(alphaEquivalent(parse("P(x)"), parse("P(y)")), false);
});

const block = blocks.find((b) => b.id === "predicados-formulas-enunciados") as Block;
const all = exercises as unknown as Exercise[];
test("formula-to-statement block is a valid catalog with enough exercises", () => {
  validateCatalog([block], all);
  assert.ok(all.length >= 20);
  assert.deepEqual(new Set(all.map((e) => e.difficulty)), new Set(["basica", "media", "avanzada"]));
  assert.ok(all.every((e, i) => e.id === `pre-fen-${String(i + 1).padStart(3, "0")}`));
  for (const e of all) {
    const opts = (e.data as { options: { id: string; correct?: boolean }[] }).options;
    assert.equal(opts.filter((o) => o.correct).length, 1, e.id);
  }
});
test("formula-to-statement grading: correct, incorrect and empty answers", () => {
  const grade = exerciseTypes["formula-to-statement"].grade;
  for (const e of all) {
    const opts = (e.data as { options: { id: string; correct?: boolean }[] }).options;
    const right = opts.find((o) => o.correct)!;
    assert.equal(grade(right.id, e).status, "correct", e.id);
    for (const o of opts.filter((x) => !x.correct)) {
      const r = grade(o.id, e);
      assert.equal(r.status, "incorrect", e.id);
      assert.ok(r.details?.[0]?.length, e.id);
    }
    assert.equal(grade("", e).status, "invalid");
    assert.equal(grade("zz", e).status, "invalid");
  }
});
test("formula-to-statement validation rejects bad data", () => {
  const base = all[0];
  const data = base.data as { formula: string; signature: unknown; options: { id: string; text: string; correct?: boolean; why?: string }[] };
  const errs = (patch: Partial<typeof data>) => {
    try { validateCatalog([block], [{ ...base, data: { ...data, ...patch } }]); } catch (e) { return (e as DomainError).code; }
  };
  assert.equal(errs({}), undefined);
  assert.equal(errs({ formula: "∀x (E(x) → B(x))" }), "predicates.unknownPredicate");
  assert.equal(errs({ formula: "∀x (E(x, x) → A(x))" }), "predicates.arityMismatch");
  assert.equal(errs({ formula: "E(x)" }), "predicates.invalidData");
  assert.equal(errs({ options: data.options.map((o) => ({ ...o, correct: undefined, why: "x" })) }), "predicates.correctOptionCount");
  assert.equal(errs({ options: data.options.map((o) => ({ ...o, correct: true })) }), "predicates.correctOptionCount");
  assert.equal(errs({ options: data.options.map((o) => (o.correct ? o : { ...o, why: "" })) }), "predicates.invalidData");
  assert.equal(errs({ options: data.options.slice(0, 2) }), "predicates.invalidData");
  try { validateCatalog([block], [{ ...base, data: undefined }]); assert.fail("should throw"); } catch (e) { assert.equal((e as DomainError).code, "predicates.invalidData"); }
});

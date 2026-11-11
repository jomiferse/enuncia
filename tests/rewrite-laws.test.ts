import assert from "node:assert/strict";
import { test } from "node:test";
import { DomainError } from "../src/domain/errors.ts";
import type { FormulaContext, LawId } from "../src/domain/logic/guided-types.ts";
import {
  canonicalKey,
  checkNormalFormStep,
  formatRewriteFormula,
  isNormalForm,
  lawLabel,
  lawsFor,
  normalFormToClauses,
  parseRewriteFormula,
} from "../src/domain/logic/rewrite-laws.ts";

const prop: FormulaContext = { language: "propositional", atoms: ["A", "B", "C"] };
const pred: FormulaContext = {
  language: "predicate",
  signature: { predicates: { P: 1, Q: 1, R: 2, S: 0 }, constants: ["a", "b"] },
};

function ok(ctx: FormulaContext, previous: string, law: LawId, result: string) {
  const r = checkNormalFormStep(ctx, previous, { law, result });
  assert.ok(r.ok, `${law}: «${previous}» -> «${result}» debería ser correcto (${r.ok ? "" : r.code})`);
  return r;
}
function bad(ctx: FormulaContext, previous: string, law: LawId, result: string, code: string) {
  const r = checkNormalFormStep(ctx, previous, { law, result });
  assert.ok(!r.ok, `${law}: «${previous}» -> «${result}» debería fallar`);
  if (!r.ok) {
    assert.equal(r.code, code);
  }
}
/** Encadena pasos aceptando cada resultado como fórmula anterior del siguiente. */
function sequence(ctx: FormulaContext, start: string, steps: [LawId, string][]) {
  let previous = start;
  for (const [law, result] of steps) {
    const r = ok(ctx, previous, law, result);
    if (r.ok && result) previous = r.result;
  }
  return previous;
}

test("laws per language and labels", () => {
  assert.ok(lawsFor("propositional").includes("fnc"));
  assert.ok(!lawsFor("propositional").includes("fns"));
  assert.ok(!lawsFor("propositional").includes("skolem"));
  assert.ok(lawsFor("predicate").includes("skolem") && lawsFor("predicate").includes("fns") && !lawsFor("predicate").includes("fnc"));
  assert.equal(lawLabel("imp"), "A → B = ¬A ∨ B");
  assert.equal(lawLabel("skolem"), "Skolemización");
  for (const id of [...lawsFor("propositional"), ...lawsFor("predicate")]) assert.ok(lawLabel(id).length > 0);
  bad(prop, "A ∨ B", "skolem", "A ∨ B", "rewrite.lawNotAllowedForLanguage");
  bad(pred, "P(a)", "fnc", "", "rewrite.lawNotAllowedForLanguage");
});

test("parsing, formatting and keys", () => {
  assert.equal(formatRewriteFormula(parseRewriteFormula(prop, "A & (B & C) | ~A -> B")), "((A ∧ B ∧ C) ∨ ¬A) → B");
  assert.equal(formatRewriteFormula(parseRewriteFormula(prop, "A ∨ (B ∨ C)")), "A ∨ B ∨ C");
  assert.equal(formatRewriteFormula(parseRewriteFormula(prop, "¬(A ∧ ■) ∨ □")), "¬(A ∧ ■) ∨ □");
  assert.equal(canonicalKey(parseRewriteFormula(prop, "A ∧ B ∧ A")), canonicalKey(parseRewriteFormula(prop, "B ∧ A")));
  assert.notEqual(canonicalKey(parseRewriteFormula(prop, "A ∨ B")), canonicalKey(parseRewriteFormula(prop, "A ∧ B")));
  assert.equal(canonicalKey(parseRewriteFormula(pred, "∀x P(x)")), canonicalKey(parseRewriteFormula(pred, "forall y P(y)")));
  assert.notEqual(canonicalKey(parseRewriteFormula(pred, "∀x R(x, a)")), canonicalKey(parseRewriteFormula(pred, "∃x R(x, a)")));
  const text = "∀x (P(x) ∨ ∃y R(x, y)) ∧ (Q(a) → ¬P(b))";
  const f = parseRewriteFormula(pred, text);
  assert.equal(canonicalKey(parseRewriteFormula(pred, formatRewriteFormula(f))), canonicalKey(f));
  assert.throws(() => parseRewriteFormula(prop, "A ∨ Z"), (e: unknown) => e instanceof DomainError && e.code === "unknownAtom");
  assert.throws(() => parseRewriteFormula(prop, "A ↔ B"), (e: unknown) => e instanceof DomainError && e.code === "rewrite.unsupportedConnective");
  assert.throws(() => parseRewriteFormula(prop, "∀x A"), DomainError);
  assert.throws(() => parseRewriteFormula(prop, ""), (e: unknown) => e instanceof DomainError && e.code === "formulaRequired");
  assert.throws(() => parseRewriteFormula(pred, "P(f(a))"), (e: unknown) => e instanceof DomainError && e.code === "predicates.unknownSymbol");
  assert.ok(parseRewriteFormula(pred, "P(f(a)) ∧ Q(c)", { allowSkolem: true }));
  assert.throws(() => parseRewriteFormula(pred, "P(f(a)) ∧ Q(f)", { allowSkolem: true }), DomainError);
});

test("imp", () => {
  ok(prop, "A → B", "imp", "¬A ∨ B");
  ok(prop, "C ∧ (A → B)", "imp", "(¬A ∨ B) ∧ C");
  ok(prop, "(A → B) → C", "imp", "¬(A → B) ∨ C");
  ok(prop, "(A → B) → C", "imp", "(¬A ∨ B) → C");
  bad(prop, "A → B", "imp", "B ∨ ¬A ∨ C", "rewrite.resultMismatch");
  bad(prop, "A → B", "imp", "A ∨ ¬B", "rewrite.resultMismatch");
  bad(prop, "A → B", "imp", "A → B", "rewrite.noChange");
  bad(prop, "A ∨ B", "imp", "A ∨ B", "rewrite.lawNotApplicable");
});

test("de Morgan", () => {
  ok(prop, "¬(A ∧ B)", "deMorganAnd", "¬A ∨ ¬B");
  ok(prop, "C ∨ ¬(A ∧ B)", "deMorganAnd", "¬B ∨ ¬A ∨ C");
  ok(prop, "¬(A ∧ B ∧ C)", "deMorganAnd", "¬A ∨ ¬B ∨ ¬C");
  ok(prop, "¬(A ∧ B ∧ C)", "deMorganAnd", "¬A ∨ ¬(B ∧ C)");
  ok(prop, "¬(A ∨ B)", "deMorganOr", "¬A ∧ ¬B");
  ok(prop, "A → ¬(B ∨ C)", "deMorganOr", "A → (¬B ∧ ¬C)");
  bad(prop, "¬(A ∧ B)", "deMorganOr", "¬A ∧ ¬B", "rewrite.lawNotApplicable");
  bad(prop, "¬(A ∧ B)", "deMorganAnd", "¬A ∧ ¬B", "rewrite.resultMismatch");
  bad(prop, "¬(A ∧ B)", "deMorganAnd", "¬A ∨ B", "rewrite.resultMismatch");
  bad(prop, "¬(A ∨ B)", "deMorganOr", "¬A ∨ ¬B", "rewrite.resultMismatch");
});

test("doubleNeg", () => {
  ok(prop, "¬¬A", "doubleNeg", "A");
  ok(prop, "B ∧ ¬¬(A ∨ C)", "doubleNeg", "B ∧ (A ∨ C)");
  ok(prop, "¬¬¬A", "doubleNeg", "¬A");
  bad(prop, "¬A ∨ B", "doubleNeg", "A ∨ B", "rewrite.lawNotApplicable");
  bad(prop, "¬¬A ∨ ¬¬B", "doubleNeg", "A ∨ B", "rewrite.resultMismatch");
});

test("distribOrAnd", () => {
  ok(prop, "A ∨ (B ∧ C)", "distribOrAnd", "(A ∨ B) ∧ (A ∨ C)");
  ok(prop, "(B ∧ C) ∨ A", "distribOrAnd", "(C ∨ A) ∧ (B ∨ A)");
  ok(prop, "A ∨ B ∨ (C ∧ A)", "distribOrAnd", "(A ∨ B ∨ C) ∧ (A ∨ B ∨ A)");
  ok(prop, "A ∨ B ∨ (C ∧ A)", "distribOrAnd", "B ∨ ((A ∨ C) ∧ (A ∨ A))");
  ok(prop, "A ∨ (B ∧ C ∧ A)", "distribOrAnd", "(A ∨ B) ∧ (A ∨ C) ∧ (A ∨ A)");
  ok(prop, "¬B ∨ (A ∨ (B ∧ C))", "distribOrAnd", "¬B ∨ ((A ∨ B) ∧ (A ∨ C))");
  bad(prop, "A ∨ (B ∧ C)", "distribOrAnd", "(A ∨ B) ∧ C", "rewrite.resultMismatch");
  bad(prop, "A ∧ (B ∨ C)", "distribOrAnd", "(A ∧ B) ∨ (A ∧ C)", "rewrite.lawNotApplicable");
  bad(prop, "A ∨ (B ∧ C)", "distribOrAnd", "A ∨ B ∨ C", "rewrite.resultMismatch");
});

test("idempotence", () => {
  ok(prop, "A ∧ B ∧ A", "idemAnd", "A ∧ B");
  ok(prop, "C ∨ (B ∧ B)", "idemAnd", "C ∨ B");
  ok(prop, "(A ∨ B) ∧ (B ∨ A)", "idemAnd", "A ∨ B");
  ok(prop, "A ∨ B ∨ A", "idemOr", "A ∨ B");
  bad(prop, "A ∧ B", "idemAnd", "A", "rewrite.lawNotApplicable");
  bad(prop, "A ∧ A", "idemAnd", "A ∧ A", "rewrite.noChange");
  bad(prop, "A ∧ A", "idemOr", "A", "rewrite.lawNotApplicable");
  bad(prop, "A ∨ B ∨ A", "idemOr", "A", "rewrite.resultMismatch");
});

test("complements", () => {
  ok(prop, "A ∧ ¬A", "contradiction", "□");
  ok(prop, "B ∨ (¬A ∧ A)", "contradiction", "B ∨ □");
  ok(prop, "A ∧ B ∧ ¬A", "contradiction", "B ∧ □");
  ok(prop, "(A ∨ B) ∧ ¬(A ∨ B)", "contradiction", "□");
  ok(prop, "A ∨ ¬A", "tautology", "■");
  ok(prop, "B ∧ (¬A ∨ A)", "tautology", "B ∧ ■");
  bad(prop, "A ∨ ¬A", "contradiction", "□", "rewrite.lawNotApplicable");
  bad(prop, "A ∧ ¬A", "tautology", "■", "rewrite.lawNotApplicable");
  bad(prop, "A ∧ ¬A", "contradiction", "■", "rewrite.resultMismatch");
  bad(prop, "A ∧ ¬B", "contradiction", "□", "rewrite.lawNotApplicable");
});

test("neutral and absorbing constants", () => {
  ok(prop, "A ∧ ■", "neutralAnd", "A");
  ok(prop, "B ∨ (A ∧ ■ ∧ C)", "neutralAnd", "B ∨ (A ∧ C)");
  ok(prop, "A ∨ □", "neutralOr", "A");
  ok(prop, "A ∨ ■", "absorbOrTop", "■");
  ok(prop, "A ∨ B ∨ ■", "absorbOrTop", "■");
  ok(prop, "A ∨ B ∨ ■", "absorbOrTop", "A ∨ ■");
  ok(prop, "A ∧ □", "absorbAndBottom", "□");
  ok(prop, "C ∨ (A ∧ □)", "absorbAndBottom", "C ∨ □");
  bad(prop, "A ∧ □", "neutralAnd", "A", "rewrite.lawNotApplicable");
  bad(prop, "A ∧ ■", "neutralAnd", "■", "rewrite.resultMismatch");
  bad(prop, "A ∨ ■", "neutralOr", "A", "rewrite.lawNotApplicable");
  bad(prop, "A ∨ ■", "absorbOrTop", "A", "rewrite.resultMismatch");
  bad(prop, "A ∧ □", "absorbAndBottom", "A", "rewrite.resultMismatch");
});

test("absorption", () => {
  ok(prop, "A ∧ (A ∨ B)", "absorbAnd", "A");
  ok(prop, "C ∧ (B ∨ A ∨ C) ∧ A", "absorbAnd", "C ∧ A");
  ok(prop, "B ∨ (A ∧ (A ∨ C))", "absorbAnd", "B ∨ A");
  ok(prop, "A ∨ (A ∧ B)", "absorbOr", "A");
  ok(prop, "(B ∧ A) ∨ A", "absorbOr", "A");
  bad(prop, "A ∧ (A ∨ B)", "absorbOr", "A", "rewrite.lawNotApplicable");
  bad(prop, "A ∧ (B ∨ C)", "absorbAnd", "A", "rewrite.lawNotApplicable");
  bad(prop, "A ∧ (A ∨ B)", "absorbAnd", "A ∨ B", "rewrite.resultMismatch");
  bad(prop, "A ∨ (A ∧ B)", "absorbOr", "B", "rewrite.resultMismatch");
});

test("terminals FNC / FNS", () => {
  ok(prop, "(A ∨ ¬B) ∧ C ∧ (¬A ∨ B)", "fnc", "");
  ok(prop, "A", "fnc", "");
  ok(prop, "■", "fnc", "");
  ok(prop, "A ∨ ¬B", "fnc", "");
  bad(prop, "A → B", "fnc", "", "rewrite.notNormalForm");
  bad(prop, "¬(A ∧ B)", "fnc", "", "rewrite.notNormalForm");
  bad(prop, "A ∨ (B ∧ C)", "fnc", "", "rewrite.notNormalForm");
  bad(prop, "(A ∨ ■) ∧ B", "fnc", "", "rewrite.notNormalForm");
  bad(prop, "¬¬A", "fnc", "", "rewrite.notNormalForm");
  const r = checkNormalFormStep(prop, "A ∨ (B ∧ C)", { law: "fnc", result: "" });
  assert.ok(!r.ok && r.params?.form === "FNC" && r.params?.reason === "distribution");

  assert.ok(isNormalForm(prop, "(A ∨ B) ∧ ¬C"));
  assert.ok(!isNormalForm(prop, "A ∧ (B ∨ (C ∧ A))"));
  assert.ok(isNormalForm(pred, "∀x ∀y ((¬P(x) ∨ R(x, y)) ∧ Q(y))"));
  assert.ok(isNormalForm(pred, "(¬P(a) ∨ Q(b)) ∧ S"));
  assert.ok(!isNormalForm(pred, "∃x P(x)"));
  assert.ok(!isNormalForm(pred, "∀x ∃y R(x, y)"));
  assert.ok(!isNormalForm(pred, "∀x (P(x) ∨ ∀y Q(y))"));
  assert.ok(!isNormalForm(pred, "∀x (P(x) → Q(x))"));
  ok(pred, "∀x (¬P(x) ∨ R(x, f(x)))", "fns", "");
  bad(pred, "∀x ∃y R(x, y)", "fns", "", "rewrite.notNormalForm");
  bad(pred, "∀x (P(x) ∨ ∀y Q(y))", "fns", "", "rewrite.notNormalForm");
  bad(pred, "∃x P(x)", "fns", "", "rewrite.notNormalForm");
});

test("notForall and notExists", () => {
  ok(pred, "¬∀x P(x)", "notForall", "∃x ¬P(x)");
  ok(pred, "Q(a) ∧ ¬∀x (P(x) → Q(x))", "notForall", "Q(a) ∧ ∃x ¬(P(x) → Q(x))");
  ok(pred, "¬∃x P(x)", "notExists", "∀x ¬P(x)");
  ok(pred, "∀y ¬∃x R(x, y)", "notExists", "∀y ∀x ¬R(x, y)");
  bad(pred, "¬∀x P(x)", "notExists", "∀x ¬P(x)", "rewrite.lawNotApplicable");
  bad(pred, "¬∀x P(x)", "notForall", "∃x P(x)", "rewrite.resultMismatch");
  bad(pred, "¬∃x P(x)", "notExists", "∃x ¬P(x)", "rewrite.resultMismatch");
  bad(pred, "¬∃x P(x)", "notForall", "∀x ¬P(x)", "rewrite.lawNotApplicable");
});

test("renaming bound variables", () => {
  ok(pred, "∀x P(x)", "renameForall", "∀y P(y)");
  ok(pred, "∃x R(x, a)", "renameExists", "∃z R(z, a)");
  ok(pred, "Q(a) ∨ ∀x (P(x) ∧ ∃y R(x, y))", "renameForall", "Q(a) ∨ ∀z (P(z) ∧ ∃y R(z, y))");
  ok(pred, "∀x P(x) ∧ ∀x Q(x)", "renameForall", "∀x P(x) ∧ ∀y Q(y)");
  bad(pred, "∀x R(x, y)", "renameForall", "∀y R(y, y)", "rewrite.resultMismatch");
  bad(pred, "∀x P(x)", "renameExists", "∃y P(y)", "rewrite.lawNotApplicable");
  bad(pred, "∀x P(x)", "renameForall", "∀y P(x)", "rewrite.resultMismatch");
  bad(pred, "∀x P(x)", "renameForall", "∀x P(x)", "rewrite.noChange");
  bad(pred, "∀x ∃y R(x, y)", "renameForall", "∀y ∃y R(y, y)", "rewrite.resultMismatch");
  bad(pred, "∀x P(x)", "renameForall", "∀y P(y) ∨ ∀y P(y)", "rewrite.resultMismatch");
});

test("moveForall", () => {
  ok(pred, "∀x P(x) ∨ Q(a)", "moveForall", "∀x (P(x) ∨ Q(a))");
  ok(pred, "Q(a) ∧ ∀x P(x)", "moveForall", "∀x (Q(a) ∧ P(x))");
  ok(pred, "∀x P(x) ∧ ∀y Q(y)", "moveForall", "∀x (P(x) ∧ ∀y Q(y))");
  ok(pred, "∀x P(x) ∧ ∀y Q(y)", "moveForall", "∀y (∀x P(x) ∧ Q(y))");
  // renombrado necesario: x es libre en el otro operando
  ok(pred, "P(x) ∨ ∀x Q(x)", "moveForall", "∀y (P(x) ∨ Q(y))");
  ok(pred, "P(x) ∨ ∀x Q(x)", "moveForall", "∀z (Q(z) ∨ P(x))");
  bad(pred, "P(x) ∨ ∀x Q(x)", "moveForall", "∀x (P(x) ∨ Q(x))", "rewrite.resultMismatch");
  // dentro de otro cuantificador y cadena de ∀
  ok(pred, "∃y (R(a, y) ∨ ∀x P(x))", "moveForall", "∃y ∀x (R(a, y) ∨ P(x))");
  ok(pred, "(∀x ∀y R(x, y)) ∨ Q(a)", "moveForall", "∀x (∀y R(x, y) ∨ Q(a))");
  ok(pred, "(∀x ∀y R(x, y)) ∨ Q(a)", "moveForall", "∀x ∀y (R(x, y) ∨ Q(a))");
  // el resultado debe ser equivalente: no se puede sacar de ∃, ni cambiar ∀ por ∃
  bad(pred, "∀x P(x) ∨ Q(a)", "moveForall", "∃x (P(x) ∨ Q(a))", "rewrite.resultMismatch");
  bad(pred, "∃x P(x) ∨ Q(a)", "moveForall", "∃x (P(x) ∨ Q(a))", "rewrite.lawNotApplicable");
  bad(pred, "∀x P(x) ∨ Q(a)", "moveForall", "∀x P(x) ∨ Q(a)", "rewrite.noChange");
  bad(pred, "∀x P(x) ∨ Q(a)", "moveForall", "∀x P(x) ∨ ∀x Q(a)", "rewrite.resultMismatch");
  bad(pred, "∀x P(x) ∨ Q(a)", "moveForall", "∀x (P(x) ∨ Q(g(a)))", "predicates.unknownSymbol");
  bad(pred, "P(a) ∨ Q(b)", "moveForall", "∀x (P(a) ∨ Q(b))", "rewrite.lawNotApplicable");
});

test("skolem", () => {
  const r = ok(pred, "∀x ∃y R(x, y)", "skolem", "∀x R(x, f(x))");
  assert.deepEqual(r.ok && r.skolemSymbols, [{ name: "f", arity: 1 }]);
  const any = ok(pred, "∀x ∃y R(x, y)", "skolem", "∀x R(x, suma(x))");
  assert.deepEqual(any.ok && any.skolemSymbols, [{ name: "suma", arity: 1 }]);
  const c = ok(pred, "∃x P(x)", "skolem", "P(c)");
  assert.deepEqual(c.ok && c.skolemSymbols, [{ name: "c", arity: 0 }]);
  ok(pred, "∀x ∃y (¬P(x) ∨ R(x, y))", "skolem", "∀x (¬P(x) ∨ R(x, g(x)))");
  ok(pred, "∀x ∀y ∃z (R(x, z) ∧ Q(y))", "skolem", "∀x ∀y (R(x, h(x, y)) ∧ Q(y))");
  ok(pred, "∃x ∀y ∃z R(y, z)", "skolem", "∃x ∀y R(y, f(y))");
  ok(pred, "∃x ∀y ∃z R(y, z)", "skolem", "∀y ∃z R(y, z)");
  ok(pred, "∀x (P(x) ∨ ∃y R(x, y))", "skolem", "∀x (P(x) ∨ R(x, k(x)))");
  ok(pred, "∀x ∃y P(x)", "skolem", "∀x P(x)");
  // símbolos no nuevos
  bad(pred, "∀x ∃y R(x, y)", "skolem", "∀x R(x, a)", "rewrite.skolemSymbolNotFresh");
  bad(pred, "∃x ∃y R(x, y)", "skolem", "∃y R(a, y)", "rewrite.skolemSymbolNotFresh");
  bad(pred, "∃y R(c, y)", "skolem", "R(c, c)", "rewrite.skolemSymbolNotFresh");
  // argumentos incorrectos
  bad(pred, "∀x ∃y R(x, y)", "skolem", "∀x R(x, f)", "rewrite.skolemArguments");
  bad(pred, "∀x ∃y R(x, y)", "skolem", "∀x R(x, f(a))", "rewrite.skolemArguments");
  bad(pred, "∀x ∃y R(x, y)", "skolem", "∀x R(x, f(x, x))", "rewrite.skolemArguments");
  bad(pred, "∃x P(x)", "skolem", "P(f(a))", "rewrite.skolemArguments");
  // otros fallos
  bad(pred, "∀x ∃y R(x, y)", "skolem", "∀x ∃y R(x, f(x))", "rewrite.resultMismatch");
  bad(pred, "∀x ∃y R(x, y)", "skolem", "R(x, f(x))", "rewrite.resultMismatch");
  bad(pred, "∀x ∃y R(x, y)", "skolem", "∀x R(x, f(x)) ∧ Q(g(x))", "rewrite.resultMismatch");
  bad(pred, "∀x P(x)", "skolem", "P(f)", "rewrite.lawNotApplicable");
  bad(pred, "¬∃x P(x)", "skolem", "¬P(f)", "rewrite.lawNotApplicable");
  bad(pred, "∃x P(x) → Q(a)", "skolem", "P(f) → Q(a)", "rewrite.lawNotApplicable");
  ok(pred, "P(a) → ∃x Q(x)", "skolem", "P(a) → Q(f)");
});

test("skolem symbols must be new with respect to the previous formula", () => {
  const first = ok(pred, "∃x ∃y R(x, y)", "skolem", "∃y R(c, y)");
  assert.deepEqual(first.ok && first.skolemSymbols, [{ name: "c", arity: 0 }]);
  const prev = first.ok ? first.result : "";
  bad(pred, prev, "skolem", "R(c, c)", "rewrite.skolemSymbolNotFresh");
  ok(pred, prev, "skolem", "R(c, d)");
  // una vez añadido a la signatura por el integrador, también se rechaza
  const extended: FormulaContext = { language: "predicate", signature: { ...pred.signature, constants: ["a", "b", "c"] } };
  bad(extended, "∃y R(a, y)", "skolem", "R(a, c)", "rewrite.skolemSymbolNotFresh");
});

test("other laws do not accept new symbols or syntax errors", () => {
  const syntax = checkNormalFormStep(prop, "A → B", { law: "imp", result: "¬A ∨ Z" });
  assert.ok(!syntax.ok && syntax.code === "unknownAtom");
  const empty = checkNormalFormStep(prop, "A → B", { law: "imp", result: "  " });
  assert.ok(!empty.ok && empty.code === "formulaRequired");
  const unbalanced = checkNormalFormStep(prop, "A → B", { law: "imp", result: "(¬A ∨ B" });
  assert.ok(!unbalanced.ok && unbalanced.code === "missingClosingParenthesis");
  const iff = checkNormalFormStep(prop, "A → B", { law: "imp", result: "A ↔ B" });
  assert.ok(!iff.ok && iff.code === "rewrite.unsupportedConnective");
});

test("normalFormToClauses keeps the clauses of the formula without simplifying", () => {
  const p = normalFormToClauses(prop, "(¬A ∨ B) ∧ (A ∨ B ∨ ¬B) ∧ (¬A ∨ B) ∧ C");
  assert.equal(p.language, "propositional");
  assert.equal(p.clauses.length, 4);
  assert.deepEqual(p.texts, ["{¬A, B}", "{A, B, ¬B}", "{¬A, B}", "{C}"]);
  assert.deepEqual(normalFormToClauses(prop, "■").clauses, []);
  assert.deepEqual(normalFormToClauses(prop, "□").texts, ["□"]);
  const q = normalFormToClauses(pred, "∀x ∀y ((¬P(x) ∨ R(x, f(x))) ∧ Q(y) ∧ (Q(y) ∨ ¬S))");
  assert.equal(q.language, "predicate");
  assert.deepEqual(q.texts, ["{¬P(x), R(x, f(x))}", "{Q(y)}", "{Q(y), ¬S}"]);
  assert.deepEqual(normalFormToClauses(pred, "P(a)").texts, ["{P(a)}"]);
  assert.throws(() => normalFormToClauses(prop, "A → B"), (e: unknown) => e instanceof DomainError && e.code === "rewrite.notNormalForm");
  assert.throws(() => normalFormToClauses(pred, "∀x ∃y R(x, y)"), (e: unknown) => e instanceof DomainError && e.code === "rewrite.notNormalForm");
});

test("complete FNC sequence: A → (B → ¬(A ∨ B))", () => {
  const last = sequence(prop, "A → (B → ¬(A ∨ B))", [
    ["imp", "¬A ∨ (B → ¬(A ∨ B))"],
    ["imp", "¬A ∨ ¬B ∨ ¬(A ∨ B)"],
    ["deMorganOr", "¬A ∨ ¬B ∨ (¬A ∧ ¬B)"],
    ["distribOrAnd", "(¬A ∨ ¬B ∨ ¬A) ∧ (¬A ∨ ¬B ∨ ¬B)"],
    ["idemOr", "(¬A ∨ ¬B) ∧ (¬A ∨ ¬B ∨ ¬B)"],
    ["idemOr", "(¬A ∨ ¬B) ∧ (¬A ∨ ¬B)"],
    ["idemAnd", "¬A ∨ ¬B"],
    ["fnc", ""],
  ]);
  assert.equal(last, "¬A ∨ ¬B");
  assert.deepEqual(normalFormToClauses(prop, last).texts, ["{¬A, ¬B}"]);
  // terminal prematuro en mitad de la secuencia
  bad(prop, "¬A ∨ ¬B ∨ (¬A ∧ ¬B)", "fnc", "", "rewrite.notNormalForm");
});

test("complete FNC sequence with constants: ¬(A → B) ∧ (B ∨ ¬B)", () => {
  const last = sequence(prop, "¬(A → B) ∧ (B ∨ ¬B)", [
    ["imp", "¬(¬A ∨ B) ∧ (B ∨ ¬B)"],
    ["deMorganOr", "(¬¬A ∧ ¬B) ∧ (B ∨ ¬B)"],
    ["doubleNeg", "A ∧ ¬B ∧ (B ∨ ¬B)"],
    ["tautology", "A ∧ ¬B ∧ ■"],
    ["neutralAnd", "A ∧ ¬B"],
    ["fnc", ""],
  ]);
  assert.equal(last, "A ∧ ¬B");
});

test("complete FNS sequence: ∀x∃y(P(x) → R(x,y))", () => {
  const last = sequence(pred, "∀x ∃y (P(x) → R(x, y))", [
    ["imp", "∀x ∃y (¬P(x) ∨ R(x, y))"],
    ["skolem", "∀x (¬P(x) ∨ R(x, f(x)))"],
    ["fns", ""],
  ]);
  assert.equal(last, "∀x (¬P(x) ∨ R(x, f(x)))");
  assert.deepEqual(normalFormToClauses(pred, last).texts, ["{¬P(x), R(x, f(x))}"]);
  // skolem antes de pasar el condicional: el ∃ está en posición positiva, pero el resultado debe ser exacto
  ok(pred, "∀x ∃y (P(x) → R(x, y))", "skolem", "∀x (P(x) → R(x, g(x)))");
  bad(pred, "∀x ∃y (P(x) → R(x, y))", "fns", "", "rewrite.notNormalForm");
});

test("complete FNS sequence with negated quantifiers and movement", () => {
  // ¬∀x (P(x) → ∃y R(x, y))  =  ∃x ∀y (P(x) ∧ ¬R(x, y))
  const last = sequence(pred, "¬∀x (P(x) → ∃y R(x, y))", [
    ["notForall", "∃x ¬(P(x) → ∃y R(x, y))"],
    ["imp", "∃x ¬(¬P(x) ∨ ∃y R(x, y))"],
    ["deMorganOr", "∃x (¬¬P(x) ∧ ¬∃y R(x, y))"],
    ["doubleNeg", "∃x (P(x) ∧ ¬∃y R(x, y))"],
    ["notExists", "∃x (P(x) ∧ ∀y ¬R(x, y))"],
    ["moveForall", "∃x ∀y (P(x) ∧ ¬R(x, y))"],
    ["skolem", "∀y (P(c) ∧ ¬R(c, y))"],
    ["fns", ""],
  ]);
  assert.equal(last, "∀y (P(c) ∧ ¬R(c, y))");
  assert.deepEqual(normalFormToClauses(pred, last).texts, ["{P(c)}", "{¬R(c, y)}"]);
});

test("FNS sequence with renaming and distribution: ∀x P(x) ∨ ∃x Q(x)", () => {
  const last = sequence(pred, "∀x P(x) ∨ ∃x Q(x)", [
    ["renameExists", "∀x P(x) ∨ ∃y Q(y)"],
    ["moveForall", "∀x (P(x) ∨ ∃y Q(y))"],
    ["skolem", "∀x (P(x) ∨ Q(f(x)))"],
    ["fns", ""],
  ]);
  assert.equal(last, "∀x (P(x) ∨ Q(f(x)))");
  const dist = sequence(pred, "∀x (P(x) ∨ (Q(x) ∧ R(x, a)))", [
    ["distribOrAnd", "∀x ((P(x) ∨ Q(x)) ∧ (P(x) ∨ R(x, a)))"],
    ["fns", ""],
  ]);
  assert.deepEqual(normalFormToClauses(pred, dist).texts, ["{P(x), Q(x)}", "{P(x), R(x, a)}"]);
});

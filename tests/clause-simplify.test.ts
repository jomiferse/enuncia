import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applicableSimplifications, checkSimplifyStep, clauseTexts, formatClauseSetText, isFullySimplified,
  parseClauseSetText, setFromClauseTexts, type AnyClauseSet, type SimplifyApplication,
} from "../src/domain/logic/clause-simplify.ts";
import type { FormulaContext, SimplifyKind } from "../src/domain/logic/guided-types.ts";

const prop: FormulaContext = { language: "propositional", atoms: ["A", "B", "C"] };
const pred: FormulaContext = {
  language: "predicate",
  signature: { predicates: { P: 1, Q: 1, R: 2 }, constants: ["a", "b"], functions: { f: 1 } },
};

const set = (ctx: FormulaContext, text: string): AnyClauseSet => {
  const r = parseClauseSetText(ctx, text);
  assert.ok(r.ok, text);
  return r.ok ? r.clauses : [];
};
const step = (ctx: FormulaContext, before: string, kind: SimplifyKind, result = "") =>
  checkSimplifyStep(ctx, set(ctx, before), { kind, result });
const kinds = (ctx: FormulaContext, text: string) => [...new Set(applicableSimplifications(ctx, set(ctx, text)).map(a => a.kind))].sort();

test("parseo y formato del conjunto de cláusulas (multiconjunto)", () => {
  assert.equal(formatClauseSetText(prop, set(prop, "{B, ¬A}; {C}\n□")), "{¬A, B}, {C}, □");
  assert.equal(formatClauseSetText(prop, set(prop, "{A}, {A}")), "{A}, {A}");
  assert.equal(formatClauseSetText(prop, set(prop, "∅")), "∅");
  assert.equal(formatClauseSetText(prop, set(prop, "{{A, B}, {¬C}}")), "{A, B}, {¬C}");
  assert.equal(formatClauseSetText(prop, set(prop, "A ∨ ¬B, C")), "{A, ¬B}, {C}");
  assert.deepEqual(clauseTexts(prop, set(prop, "{A,B},{¬A}")), ["{A, B}", "{¬A}"]);
  assert.equal(formatClauseSetText(pred, set(pred, "{P(x), ¬R(x, f(a))}, {Q(b)}")), "{P(x), ¬R(x, f(a))}, {Q(b)}");
  assert.deepEqual(clauseTexts(pred, setFromClauseTexts(pred, ["{P(x)}", "□"])), ["{P(x)}", "□"]);
  assert.throws(() => setFromClauseTexts(prop, ["{Z}"]));
  for (const bad of ["", "{A, Z}", "{A, B"]) assert.equal(parseClauseSetText(prop, bad).ok, false, bad);
  const unknown = parseClauseSetText(prop, "{Z}");
  assert.ok(!unknown.ok && unknown.code === "unknownAtom");
  assert.equal(parseClauseSetText(pred, "{S(x)}").ok, false);
});

test("subsunción válida e inválida (enunciados)", () => {
  assert.ok(kinds(prop, "{A}, {A, B}").includes("subsumption"));
  const ok = step(prop, "{A}, {A, B}, {¬C}", "subsumption", "{A}, {¬C}");
  assert.ok(ok.ok && formatClauseSetText(prop, ok.after) === "{A}, {¬C}");
  assert.ok(step(prop, "{A, B}, {A}", "subsumption", "{A}").ok);
  const wrong = step(prop, "{A}, {A, B}, {¬C}", "subsumption", "{A, B}, {¬C}");
  assert.ok(!wrong.ok && wrong.code === "simplify.wrongResult");
  const none = step(prop, "{A, B}, {¬C}", "subsumption", "{¬C}");
  assert.ok(!none.ok && none.code === "simplify.notApplicable");
  const same = step(prop, "{A}, {A, B}", "subsumption", "{A}, {A, B}");
  assert.ok(!same.ok && same.code === "simplify.unchanged");
  const extra = step(prop, "{A}, {A, B}", "subsumption", "{A}, {C}");
  assert.ok(!extra.ok && extra.code === "simplify.notSubset");
  // la cláusula vacía subsume a todo
  assert.ok(step(prop, "□, {A}", "subsumption", "□").ok);
  // varias subsumidas a la vez
  assert.ok(step(prop, "{A}, {A, B}, {A, C}", "subsumption", "{A}").ok);
  // resultado ilegible
  const bad = step(prop, "{A}, {A, B}", "subsumption", "{A, Z}");
  assert.ok(!bad.ok && bad.code === "unknownAtom");
});

test("literal puro", () => {
  assert.ok(kinds(prop, "{A, B}, {¬B, C}").includes("pure"));
  // A y C son puros: quitar las cláusulas con A
  assert.ok(step(prop, "{A, B}, {¬B, C}, {¬B}", "pure", "{¬B, C}, {¬B}").ok);
  // quitar todas las que tienen algún literal puro
  assert.ok(step(prop, "{A, B}, {¬B, C}, {¬B}", "pure", "{¬B}").ok);
  // sin puros
  const none = step(prop, "{A, B}, {¬A, ¬B}", "pure", "{A, B}");
  assert.ok(!none.ok && none.code === "simplify.notApplicable");
  // quitar una cláusula sin literal puro
  const wrong = step(prop, "{A, B}, {¬B, C}, {¬B}", "pure", "{A, B}, {¬B, C}");
  assert.ok(!wrong.ok && wrong.code === "simplify.wrongResult");
  // el conjunto puede quedar vacío
  const empty = step(prop, "{A}, {B, C}", "pure", "{B, C}");
  assert.ok(empty.ok);
  assert.ok(step(prop, "{A}, {B}", "pure", "∅").ok);
});

test("cláusula tautológica", () => {
  assert.ok(step(prop, "{A, ¬A}, {B}", "tautology", "{B}").ok);
  const bad = step(prop, "{A, B}, {B}", "tautology", "{B}");
  assert.ok(!bad.ok && bad.code === "simplify.notApplicable");
  const wrong = step(prop, "{A, ¬A}, {B}", "tautology", "{A, ¬A}");
  assert.ok(!wrong.ok && wrong.code === "simplify.wrongResult");
  // dos tautologías: una o las dos
  assert.ok(step(prop, "{A, ¬A}, {B, ¬B}, {C}", "tautology", "{B, ¬B}, {C}").ok);
  assert.ok(step(prop, "{A, ¬A}, {B, ¬B}, {C}", "tautology", "{C}").ok);
});

test("cláusula repetida", () => {
  assert.ok(step(prop, "{A, B}, {B, A}, {C}", "repeated", "{A, B}, {C}").ok);
  const bad = step(prop, "{A, B}, {C}", "repeated", "{C}");
  assert.ok(!bad.ok && bad.code === "simplify.notApplicable");
  const wrong = step(prop, "{A}, {A}, {C}", "repeated", "{C}");
  assert.ok(!wrong.ok && wrong.code === "simplify.wrongResult");
  // las repetidas no cuentan como subsunción
  assert.ok(!kinds(prop, "{A}, {A}").includes("subsumption"));
});

test("«no se puede simplificar más»", () => {
  const premature = step(prop, "{A}, {A, B}", "none");
  assert.ok(!premature.ok && premature.code === "simplify.stillSimplifiable");
  assert.ok(!step(prop, "{A, ¬A}", "none").ok);
  assert.ok(!step(prop, "{A}, {A}", "none").ok);
  assert.ok(step(prop, "{A, B}, {¬A, ¬B}", "none").ok);
  assert.ok(isFullySimplified(prop, set(prop, "{¬A, ¬B}, {A}, {B}")));
  assert.ok(isFullySimplified(prop, set(prop, "∅")));
  const unknown = checkSimplifyStep(prop, set(prop, "{A}"), { kind: "bogus" as SimplifyKind, result: "" });
  assert.ok(!unknown.ok && unknown.code === "simplify.badKind");
});

test("cada aplicable da un conjunto distinto y simplificar termina", () => {
  let current: AnyClauseSet = set(prop, "{A, ¬A}, {B}, {B, C}, {B}, {¬C, A}");
  for (let n = 0; n < 10 && !isFullySimplified(prop, current); n++) {
    const apps: SimplifyApplication[] = applicableSimplifications(prop, current);
    for (const kind of new Set(apps.map(a => a.kind))) {
      const texts: string[] = apps.filter(a => a.kind === kind).map(a => formatClauseSetText(prop, a.result));
      assert.equal(new Set(texts).size, texts.length);
    }
    current = apps[0].result;
  }
  assert.ok(isFullySimplified(prop, current));
});

test("predicados: variantes, subsunción con sustitución y literal puro", () => {
  // {P(x)} subsume a {P(a), Q(b)} y a {P(f(x)), R(x, a)}
  assert.ok(step(pred, "{P(x)}, {P(a), Q(b)}", "subsumption", "{P(x)}").ok);
  assert.ok(step(pred, "{P(x)}, {P(f(y)), Q(y)}", "subsumption", "{P(x)}").ok);
  // la inversa no subsume
  const inv = step(pred, "{P(a)}, {P(x), Q(x)}", "subsumption", "{P(a)}");
  assert.ok(!inv.ok);
  // resultado comparado módulo variables
  assert.ok(step(pred, "{P(x)}, {P(a), Q(b)}", "subsumption", "{P(z)}").ok);
  // dos variables a la vez: {R(x, y)} subsume a {R(a, b)}; {R(x, x)} no subsume a {R(a, b)}
  assert.ok(step(pred, "{R(x, y)}, {R(a, b)}", "subsumption", "{R(x, y)}").ok);
  assert.ok(!kinds(pred, "{R(x, x)}, {R(a, b)}").includes("subsumption"));
  // repetidas = variantes
  assert.ok(step(pred, "{P(x), Q(y)}, {Q(z), P(w)}", "repeated", "{P(x), Q(y)}").ok);
  assert.ok(!kinds(pred, "{P(x)}, {P(a)}").includes("repeated"));
  // tautología sintáctica
  assert.ok(step(pred, "{P(x), ¬P(x)}, {Q(a)}", "tautology", "{Q(a)}").ok);
  assert.ok(!kinds(pred, "{P(x), ¬P(y)}").includes("tautology"));
  // puro: ¬P(x) no unifica con ningún P(...) porque no hay; Q(a) frente a ¬Q(b) no unifican
  assert.ok(step(pred, "{P(x), Q(a)}, {¬Q(b)}", "pure", "{¬Q(b)}").ok);
  const notPure = step(pred, "{P(x)}, {¬P(a)}", "pure", "{¬P(a)}");
  assert.ok(!notPure.ok && notPure.code === "simplify.notApplicable");
  // símbolos de Skolem libres
  assert.ok(step(pred, "{P(sk1)}, {P(sk1), Q(a)}", "subsumption", "{P(sk1)}").ok);
  assert.ok(isFullySimplified(pred, set(pred, "{P(x), Q(x)}, {¬P(a)}, {¬Q(b)}")));
  assert.ok(step(pred, "{P(x), Q(x)}, {¬P(a)}, {¬Q(b)}", "none").ok);
  assert.ok(!step(pred, "{P(x)}, {P(a), Q(b)}", "none").ok);
});

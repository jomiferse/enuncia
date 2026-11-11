import assert from "node:assert/strict";
import { test } from "node:test";
import { setFromClauseTexts } from "../src/domain/logic/clause-simplify.ts";
import type { FormulaContext, TreeStep } from "../src/domain/logic/guided-types.ts";
import { checkTree, checkTreeStep, treePossibleSemantics } from "../src/domain/logic/resolution-tree.ts";

const prop: FormulaContext = { language: "propositional", atoms: ["A", "B", "C"] };
const pred: FormulaContext = {
  language: "predicate",
  signature: { predicates: { P: 1, Q: 1, R: 2 }, constants: ["a", "b"], functions: { f: 1 } },
};
const set = (ctx: FormulaContext, ...texts: string[]) => setFromClauseTexts(ctx, texts);
const st = (trunk: number, side: number, trunkLiteral: string, sideLiteral: string): TreeStep => ({ trunk, side, trunkLiteral, sideLiteral });
const failCode = (r: ReturnType<typeof checkTreeStep>) => (r.ok ? "ok" : r.code);

test("ejemplo clásico: {¬A∨¬B, A, B}", () => {
  const start = set(prop, "{¬A, ¬B}", "{A}", "{B}");
  // troncal ¬A∨¬B con lateral B -> ¬A; con lateral A -> □
  const r = checkTree(prop, start, [st(0, 2, "¬B", "B"), st(3, 1, "¬A", "A")]);
  assert.deepEqual(r.results.map(x => x.ok), [true, true]);
  assert.deepEqual(r.results.map(x => x.resolvent), ["{¬A}", "□"]);
  assert.deepEqual(r.available, ["{¬A, ¬B}", "{A}", "{B}", "{¬A}", "□"]);
  assert.ok(r.reachedEmpty);
  assert.equal(r.results[0].substitution, undefined);
  assert.equal(treePossibleSemantics(prop, start), true);
  assert.equal(treePossibleSemantics(prop, set(prop, "{A, B}", "{¬A}")), false);
  assert.equal(treePossibleSemantics(pred, set(pred, "{P(x)}")), undefined);
});

test("errores de un paso proposicional", () => {
  const start = set(prop, "{¬A, ¬B}", "{A}", "{B}");
  assert.equal(failCode(checkTreeStep(prop, start, st(5, 0, "A", "A"))), "tree.trunkOutOfRange");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 3, "¬A", "A"))), "tree.sideOutOfRange");
  assert.equal(failCode(checkTreeStep(prop, start, st(-1, 0, "¬A", "A"))), "tree.trunkOutOfRange");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 1.5, "¬A", "A"))), "tree.sideOutOfRange");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 1, "", "A"))), "tree.literalRequired");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 1, "¬A", "¬¬A"))), "tree.badLiteral");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 1, "¬A ∨ ¬B", "A"))), "tree.badLiteral");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 1, "¬Z", "A"))), "tree.badLiteral");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 1, "¬C", "A"))), "tree.literalNotInClause");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 1, "¬A", "B"))), "tree.literalNotInClause");
  assert.equal(failCode(checkTreeStep(prop, start, st(0, 2, "¬A", "B"))), "tree.notComplementary");
  assert.equal(failCode(checkTreeStep(prop, set(prop, "{A, B}", "{A, C}"), st(0, 1, "A", "A"))), "tree.notComplementary");
  const ok = checkTreeStep(prop, set(prop, "{A, B}", "{¬A, C}"), st(0, 1, "A", "¬A"));
  assert.ok(ok.ok && ok.resolventText === "{B, C}");
  // tautológico permitido
  const taut = checkTreeStep(prop, set(prop, "{A, B}", "{¬A, ¬B}"), st(0, 1, "A", "¬A"));
  assert.ok(taut.ok && taut.resolventText === "{B, ¬B}");
});

test("checkTree: errores propagan y no evaluables", () => {
  const start = set(prop, "{¬A, ¬B}", "{A}", "{B}");
  const r = checkTree(prop, start, [st(0, 2, "¬B", "B"), st(3, 2, "¬A", "B"), st(3, 1, "¬A", "A")]);
  assert.deepEqual(r.results.map(x => x.ok), [true, false, false]);
  assert.equal(r.results[1].code, "tree.notComplementary");
  assert.equal(r.results[2].code, "tree.notEvaluated");
  assert.ok(!r.reachedEmpty);
  assert.equal(r.available.length, 4);
  // un resolvente solo se puede elegir si ya existe
  assert.equal(checkTree(prop, start, [st(3, 1, "¬A", "A")]).results[0].code, "tree.trunkOutOfRange");
  // pasos tras □
  const done = checkTree(prop, set(prop, "{A}", "{¬A}"), [st(0, 1, "A", "¬A"), st(0, 1, "A", "¬A")]);
  assert.deepEqual(done.results.map(x => x.ok), [true, false]);
  assert.equal(done.results[1].code, "tree.alreadyFinished");
  assert.ok(done.reachedEmpty);
  assert.deepEqual(checkTree(prop, start, []), { results: [], available: ["{¬A, ¬B}", "{A}", "{B}"], reachedEmpty: false });
});

test("predicados: unificación y sustitución mostrada", () => {
  const start = set(pred, "{¬P(x), Q(x)}", "{P(a)}", "{¬Q(a)}");
  const r = checkTree(pred, start, [st(0, 1, "¬P(x)", "P(a)"), st(3, 2, "Q(a)", "¬Q(a)")]);
  assert.deepEqual(r.results.map(x => x.ok), [true, true]);
  assert.equal(r.results[0].resolvent, "{Q(a)}");
  assert.equal(r.results[0].substitution, "{x/a}");
  assert.equal(r.results[1].resolvent, "□");
  assert.equal(r.results[1].substitution, "{}");
  assert.ok(r.reachedEmpty);
});

test("predicados: renombrado de la lateral", () => {
  // misma variable x en troncal y lateral
  const start = set(pred, "{¬P(x), Q(x)}", "{P(f(x))}");
  const r = checkTreeStep(pred, start, st(0, 1, "¬P(x)", "P(f(x))"));
  assert.ok(r.ok);
  assert.equal(r.ok && r.resolventText, "{Q(f(x'))}");
  assert.equal(r.ok && r.substitution, "{x/f(x')}");
  // resolver una cláusula consigo misma (renombrada)
  const self = checkTreeStep(pred, set(pred, "{¬P(x), P(f(x))}"), st(0, 0, "¬P(x)", "P(f(x))"));
  assert.ok(self.ok);
  assert.equal(self.ok && self.resolventText, "{P(f(f(x'))), ¬P(x')}");
  // los dos literales de la troncal que coinciden tras θ se colapsan
  const fac = checkTreeStep(pred, set(pred, "{Q(x), Q(a), R(x, y)}", "{¬Q(a)}"), st(0, 1, "Q(x)", "¬Q(a)"));
  assert.ok(fac.ok && fac.resolventText === "{Q(a), R(a, y)}");
});

test("predicados: errores (no unifican, occurs-check, no complementarios)", () => {
  const start = set(pred, "{P(a), Q(x)}", "{¬P(b)}", "{¬Q(f(x))}", "{P(x)}", "{R(x, f(x))}", "{¬R(y, y)}", "{Q(a)}");
  assert.equal(failCode(checkTreeStep(pred, start, st(0, 1, "P(a)", "¬P(b)"))), "tree.notUnifiable");
  // x frente a f(x): como la lateral se renombra, no hay occurs-check; sí con R(x, f(x)) y ¬R(y, y)
  const occ = checkTreeStep(pred, start, st(4, 5, "R(x, f(x))", "¬R(y, y)"));
  assert.equal(failCode(occ), "tree.occursCheck");
  assert.ok(!occ.ok && typeof occ.params?.variable === "string" && occ.params.variable !== "");
  assert.equal(failCode(checkTreeStep(pred, start, st(0, 6, "P(a)", "Q(a)"))), "tree.notComplementary");
  assert.equal(failCode(checkTreeStep(pred, start, st(0, 3, "P(a)", "P(x)"))), "tree.notComplementary");
  assert.equal(failCode(checkTreeStep(pred, start, st(0, 1, "P(b)", "¬P(b)"))), "tree.literalNotInClause");
  assert.equal(failCode(checkTreeStep(pred, start, st(0, 1, "P(a)", "¬P(a)"))), "tree.literalNotInClause");
  assert.equal(failCode(checkTreeStep(pred, start, st(0, 1, "S(a)", "¬P(b)"))), "tree.badLiteral");
  assert.equal(failCode(checkTreeStep(pred, start, st(9, 1, "P(a)", "¬P(b)"))), "tree.trunkOutOfRange");
  // unifica con función: Q(x) con ¬Q(f(x)) tras renombrar -> x/f(x')
  const f = checkTreeStep(pred, start, st(0, 2, "Q(x)", "¬Q(f(x))"));
  assert.ok(f.ok && f.resolventText === "{P(a)}" && f.substitution === "{x/f(x')}");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalRule, checkProof, parseProof } from "../src/domain/logic/deduction.ts";

const atoms = ["P", "Q", "R", "S"];
const run = (text: string, premises: string[], conclusion: string, rules?: string[]) =>
  checkProof(text, { premises, conclusion, atoms, rules });
const ok = (text: string, premises: string[], conclusion: string) => {
  const r = run(text, premises, conclusion);
  assert.equal(r.status, "correct", r.message);
};
const bad = (text: string, premises: string[], conclusion: string, line: number, code: string, status = "incorrect") => {
  const r = run(text, premises, conclusion);
  assert.equal(r.status, status, r.message);
  assert.equal(r.line, line, r.message);
  assert.equal(r.messageCode, code, r.message);
};

test("parseProof lee marcadores, alias y rangos", () => {
  const parsed = parseProof("1. P & Q ; Premisa\n > 2. P ; ∧E ; 1\n3. R ; ->E ; 1, 2-2");
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  assert.equal(parsed.lines[1].depth, 1);
  assert.equal(parsed.lines[1].rule, "∧E");
  assert.deepEqual(parsed.lines[2].citations, [{ from: 1, to: 1 }, { from: 2, to: 2 }]);
  assert.equal(canonicalRule("andI"), "∧I");
  assert.equal(canonicalRule("⊥I"), "¬E");
  assert.equal(canonicalRule("Hip"), "Hipótesis");
  assert.equal(canonicalRule("<->E"), "↔E");
  assert.equal(canonicalRule("foo"), undefined);
});

test("errores de sintaxis son invalid", () => {
  assert.equal(run("", [], "P").messageCode, "deduction.empty");
  bad("1. P Premisa", ["P"], "P", 1, "deduction.lineSyntax", "invalid");
  bad("2. P ; Premisa", ["P"], "P", 1, "deduction.lineNumber", "invalid");
  bad("1. P ; Magia", ["P"], "P", 1, "deduction.unknownRule", "invalid");
  bad("1. P ; Premisa\n2. P ; Reit ; x", ["P"], "P", 2, "deduction.badCitations", "invalid");
  bad("1. P & ; Premisa", ["P"], "P", 1, "deduction.formula", "invalid");
  bad("1. Z ; Premisa", ["P"], "P", 1, "deduction.formula", "invalid");
});

test("Premisa e Hipótesis", () => {
  ok("1. P ; Premisa", ["P"], "P");
  bad("1. Q ; Premisa", ["P"], "Q", 1, "deduction.premiseNotGiven");
  bad("1. P ; Premisa\n2. > Q ; Hipótesis\n3. > R ; Premisa", ["P", "R"], "P", 3, "deduction.premiseDepth");
  bad("1. > P ; Hipótesis\n2. > > Q ; Hipótesis\n3. > > > R ; Hip\n4. S ; Hip", [], "P", 4, "deduction.depth");
  bad("1. P ; Premisa\n2. > Q ; Hipótesis", ["P"], "Q", 2, "deduction.openHypothesis");
  bad("1. P ; Premisa", ["P"], "Q", 1, "deduction.notConclusion");
});

test("Reiteración", () => {
  ok("1. P ; Premisa\n2. Q ; Premisa\n3. > R ; Hip\n4. > P ; Reit ; 1\n5. R → P ; →I ; 3-4", ["P", "Q"], "R → P");
  bad("1. P ; Premisa\n2. Q ; Reit ; 1", ["P"], "Q", 2, "deduction.lineRule");
});

test("∧I y ∧E", () => {
  ok("1. P ; Premisa\n2. Q ; Premisa\n3. Q & P ; ∧I ; 1, 2", ["P", "Q"], "Q ∧ P");
  ok("1. P ; Premisa\n2. P ∧ P ; ∧I ; 1", ["P"], "P ∧ P");
  bad("1. P ; Premisa\n2. Q ; Premisa\n3. P ∧ R ; ∧I ; 1, 2", ["P", "Q"], "P ∧ R", 3, "deduction.lineRule");
  ok("1. P ∧ Q ; Premisa\n2. Q ; ∧E ; 1", ["P ∧ Q"], "Q");
  bad("1. P ∨ Q ; Premisa\n2. Q ; ∧E ; 1", ["P ∨ Q"], "Q", 2, "deduction.lineRule");
  bad("1. P ∧ Q ; Premisa\n2. R ; ∧E ; 1", ["P ∧ Q"], "R", 2, "deduction.lineRule");
});

test("∨I y ∨E", () => {
  ok("1. P ; Premisa\n2. Q ∨ P ; ∨I ; 1", ["P"], "Q ∨ P");
  bad("1. P ; Premisa\n2. Q ∨ R ; ∨I ; 1", ["P"], "Q ∨ R", 2, "deduction.lineRule");
  const proof = [
    "1. P ∨ Q ; Premisa",
    "2. > P ; Hipótesis",
    "3. > Q ∨ P ; ∨I ; 2",
    "4. > Q ; Hipótesis",
    "5. > Q ∨ P ; ∨I ; 4",
    "6. Q ∨ P ; ∨E ; 1, 2-3, 4-5",
  ].join("\n");
  ok(proof, ["P ∨ Q"], "Q ∨ P");
  bad(proof.replace("4-5", "2-5"), ["P ∨ Q"], "Q ∨ P", 6, "deduction.citeNotBox");
  bad(proof.replace("Q ∨ P ; ∨I ; 4", "P ∨ Q ; ∨I ; 4"), ["P ∨ Q"], "Q ∨ P", 6, "deduction.lineRule");
  bad(proof.replace("1, 2-3, 4-5", "1, 2-3"), ["P ∨ Q"], "Q ∨ P", 6, "deduction.citeCount");
});

test("→I y →E", () => {
  ok("1. P → Q ; Premisa\n2. P ; Premisa\n3. Q ; →E ; 1, 2", ["P → Q", "P"], "Q");
  ok("1. P ; Premisa\n2. P → Q ; Premisa\n3. Q ; →E ; 2, 1", ["P", "P → Q"], "Q");
  bad("1. P → Q ; Premisa\n2. R ; Premisa\n3. Q ; →E ; 1, 2", ["P → Q", "R"], "Q", 3, "deduction.lineRule");
  ok("1. > P ; Hipótesis\n2. > P ∨ Q ; ∨I ; 1\n3. P → (P ∨ Q) ; →I ; 1-2", [], "P → (P ∨ Q)");
  bad("1. > P ; Hipótesis\n2. > P ∨ Q ; ∨I ; 1\n3. Q → (P ∨ Q) ; →I ; 1-2", [], "Q → (P ∨ Q)", 3, "deduction.lineRule");
});

test("subpruebas: citas cerradas, abiertas y posteriores", () => {
  const closed = "1. P ; Premisa\n2. > Q ; Hip\n3. > P ∧ Q ; ∧I ; 1, 2\n4. Q → (P ∧ Q) ; →I ; 2-3\n5. P ∧ Q ; ∧E ; 3";
  bad(closed, ["P"], "P ∧ Q", 5, "deduction.citeClosed");
  bad("1. P ; Premisa\n2. > Q ; Hip\n3. > P ∧ Q ; ∧I ; 1, 2\n4. > Q → (P ∧ Q) ; →I ; 2-3", ["P"], "P", 4, "deduction.citeOpenBox");
  bad("1. P ; Premisa\n2. P ∧ P ; ∧I ; 1, 3\n3. P ; Reit ; 1", ["P"], "P", 2, "deduction.citeLater");
  bad("1. P ; Premisa\n2. P ; Reit ; 7", ["P"], "P", 2, "deduction.citeMissing");
  bad("1. P ; Premisa\n2. P ; Reit ; 2", ["P"], "P", 2, "deduction.citeLater");
});

test("¬I, ¬E, ⊥E y RAA", () => {
  const notI = "1. P → Q ; Premisa\n2. ¬Q ; Premisa\n3. > P ; Hip\n4. > Q ; →E ; 1, 3\n5. > ⊥ ; ¬E ; 4, 2\n6. ¬P ; ¬I ; 3-5";
  ok(notI, ["P → Q", "¬Q"], "¬P");
  ok(notI.replace("¬E ; 4, 2", "⊥I ; 2, 4"), ["P → Q", "¬Q"], "¬P");
  bad(notI.replace("¬E ; 4, 2", "¬E ; 4, 1"), ["P → Q", "¬Q"], "¬P", 5, "deduction.lineRule");
  bad(notI.replace("> ⊥ ;", "> Q ;").replace("¬E", "Reit").replace("4, 2", "4"), ["P → Q", "¬Q"], "¬P", 6, "deduction.lineRule");
  ok("1. ⊥ ; Premisa\n2. P ; ⊥E ; 1", ["⊥"], "P");
  bad("1. Q ; Premisa\n2. P ; ⊥E ; 1", ["Q"], "P", 2, "deduction.lineRule");
  const raa = "1. ¬¬P ; Premisa\n2. > ¬P ; Hip\n3. > ⊥ ; ¬E ; 2, 1\n4. P ; RAA ; 2-3";
  ok(raa, ["¬¬P"], "P");
  bad(raa.replace("4. P ;", "4. Q ;"), ["¬¬P"], "Q", 4, "deduction.lineRule");
  bad("1. P ; Premisa\n2. > P ; Hip\n3. > ⊥ ; ¬E ; 1, 2\n4. P ; RAA ; 2-3", ["P"], "P", 3, "deduction.lineRule");
});

test("↔I y ↔E", () => {
  ok("1. P ↔ Q ; Premisa\n2. P ; Premisa\n3. Q ; ↔E ; 1, 2", ["P ↔ Q", "P"], "Q");
  ok("1. P ↔ Q ; Premisa\n2. Q ; Premisa\n3. P ; ↔E ; 2, 1", ["P ↔ Q", "Q"], "P");
  bad("1. P ↔ Q ; Premisa\n2. R ; Premisa\n3. Q ; ↔E ; 1, 2", ["P ↔ Q", "R"], "Q", 3, "deduction.lineRule");
  const boxes = "1. > P ; Hip\n2. > P ; Reit ; 1\n3. P → P ; →I ; 1-2\n4. P ↔ P ; ↔I ; 3, 3";
  ok(boxes, [], "P ↔ P");
  const proof = [
    "1. P → Q ; Premisa", "2. Q → P ; Premisa",
    "3. P ↔ Q ; ↔I ; 1, 2",
  ].join("\n");
  ok(proof, ["P → Q", "Q → P"], "P ↔ Q");
  bad(proof.replace("3. P ↔ Q", "3. P ↔ R"), ["P → Q", "Q → P"], "P ↔ R", 3, "deduction.lineRule");
  const sub = [
    "1. P ∧ Q ; Premisa",
    "2. > P ; Hip", "3. > Q ; ∧E ; 1", "4. > Q ; Reit ; 3",
    "5. > Q ; Hip", "6. > P ; ∧E ; 1",
    "7. P ↔ Q ; ↔I ; 2-4, 5-6",
  ].join("\n");
  ok(sub, ["P ∧ Q"], "P ↔ Q");
});

test("demostraciones completas", () => {
  ok(
    ["1. P → Q ; Premisa", "2. Q → R ; Premisa", "3. > P ; Hipótesis", "4. > Q ; →E ; 1, 3", "5. > R ; →E ; 2, 4", "6. P → R ; →I ; 3-5"].join("\n"),
    ["P → Q", "Q → R"],
    "P → R",
  );
  ok(
    ["1. ¬(P ∨ Q) ; Premisa", "2. > P ; Hip", "3. > P ∨ Q ; ∨I ; 2", "4. > ⊥ ; ¬E ; 3, 1", "5. ¬P ; ¬I ; 2-4",
     "6. > Q ; Hip", "7. > P ∨ Q ; ∨I ; 6", "8. > ⊥ ; ¬E ; 7, 1", "9. ¬Q ; ¬I ; 6-8", "10. ¬P ∧ ¬Q ; ∧I ; 5, 9"].join("\n"),
    ["¬(P ∨ Q)"],
    "¬P ∧ ¬Q",
  );
  // Tercero excluido con RAA y subpruebas anidadas.
  ok(
    ["1. > ¬(P ∨ ¬P) ; Hipótesis", "2. > > P ; Hip", "3. > > P ∨ ¬P ; ∨I ; 2", "4. > > ⊥ ; ¬E ; 3, 1", "5. > ¬P ; ¬I ; 2-4",
     "6. > P ∨ ¬P ; ∨I ; 5", "7. > ⊥ ; ¬E ; 6, 1", "8. P ∨ ¬P ; RAA ; 1-7"].join("\n"),
    [],
    "P ∨ ¬P",
  );
  // Notación `|` como marcador, alias ASCII y `;`.
  ok("1. P & Q ; Premisa\n2. P ; &E ; 1", ["P & Q"], "P");
  ok("1. P -> Q ; Premisa\n| 2. P ; Hip\n| 3. Q ; ->E ; 1, 2\n4. P -> Q ; ->I ; 2-3\n", ["P -> Q"], "P -> Q");
});

test("restricción de reglas y primera línea errónea", () => {
  const text = "1. P ∧ Q ; Premisa\n2. P ; ∧E ; 1";
  assert.equal(run(text, ["P ∧ Q"], "P", ["∧E"]).status, "correct");
  const r = run(text, ["P ∧ Q"], "P", ["∨I"]);
  assert.equal(r.messageCode, "deduction.ruleNotAllowed");
  assert.equal(r.line, 2);
  const first = run("1. P ; Premisa\n2. Q ; Reit ; 1\n3. R ; Reit ; 1", ["P"], "R");
  assert.equal(first.line, 2);
});

test("las reglas de cuantificadores no existen en enunciados y todos los códigos tienen traducción", async () => {
  const r = run("1. P ; Premisa\n2. P ; ∀E ; 1", ["P"], "P");
  assert.equal(r.messageCode, "deduction.ruleNotAllowed");
  assert.equal(canonicalRule("∃E"), "∃E");
  const { i18n } = await import("../src/shared/i18n/config.ts");
  const codes = [
    "correct", "empty", "tooLong", "tooManyLines", "lineSyntax", "lineNumber", "unknownRule", "badCitations", "formula",
    "ruleNotAllowed", "depth", "premiseDepth", "premiseNotGiven", "citeCount", "citeMissing", "citeLater", "citeClosed",
    "citeOpenBox", "citeNotBox", "citeKind", "lineRule", "openHypothesis", "notConclusion", "captured", "notVariable",
    "eigenQuantified", "eigenConclusion", "eigenPremise", "eigenHypothesis",
  ];
  for (const c of codes) assert.ok(i18n.exists(`errors.deduction.${c}`), c);
});

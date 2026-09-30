import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { evaluate, formatFormula } from "../src/domain/logic/evaluation.ts";
import { grade } from "../src/domain/logic/grading.ts";
import { parseFormula } from "../src/domain/logic/parser.ts";
import type { Exercise } from "../src/domain/models";
const atoms = ["P", "Q", "R", "S", "V", "D", "L"];
test("cada conectiva tiene su tabla de verdad correcta", () => {
  for (const p of [false, true])
    for (const q of [false, true]) {
      const v = { P: p, Q: q };
      for (const [formula, expected] of [
        ["¬P", !p],
        ["P ∧ Q", p && q],
        ["P ∨ Q", p || q],
        ["P → Q", !p || q],
        ["P ↔ Q", p === q],
      ] as const)
        assert.equal(evaluate(parseFormula(formula, atoms), v), expected);
    }
});
test("alias, precedencia y formato de interpretación", () => {
  assert.equal(
    formatFormula(parseFormula("~P & Q | R -> S", atoms)),
    "(((¬P ∧ Q) ∨ R) → S)",
  );
  assert.equal(grade("P <-> Q", "(P → Q) ∧ (Q → P)", atoms).status, "correct");
  assert.equal(grade("!(P & Q)", "~P | ~Q", atoms).status, "correct");
});
test("equivalencias, dirección de flechas y referencia ALURA", () => {
  assert.equal(grade("P → (S → Q)", "(P ∧ S) → Q", atoms).status, "correct");
  assert.equal(grade("P → Q", "Q → P", atoms).status, "incorrect");
  assert.equal(
    grade("~(V -> D) | (S -> L)", "(V → D) → (S → L)", atoms).status,
    "correct",
  );
  assert.equal(
    grade("(V → D) ∧ (S → L)", "(V → D) → (S → L)", atoms).status,
    "incorrect",
  );
});
test("contraejemplo reproduce la discrepancia", () => {
  const result = grade("P → Q", "Q → P", ["P", "Q"]);
  assert.ok(result.counterexample);
  assert.notEqual(result.actual, result.expected);
  assert.equal(
    evaluate(parseFormula("P → Q", atoms), result.counterexample),
    result.actual,
  );
});
test("errores de sintaxis, átomos desconocidos y cadenas ambiguas", () => {
  for (const formula of [
    "",
    "Z",
    "P Q",
    "(P ∧ Q",
    "P)",
    "P → Q → R",
    "P ↔ Q → R",
    "P + Q",
    "P ∧",
    "¬".repeat(70) + "P",
  ])
    assert.equal(grade(formula, "P", atoms).status, "invalid", formula);
  assert.equal(grade("(P → Q) → R", "(P → Q) → R", atoms).status, "correct");
});
const exercises = JSON.parse(
  readFileSync(
    new URL("../src/data/content/formalizacion.json", import.meta.url),
    "utf8",
  ),
) as Exercise[];
test("banco completo y soluciones con tablas válidas", () => {
  assert.equal(exercises.length, 40);
  assert.equal(new Set(exercises.map((e) => e.id)).size, 40);
  assert.deepEqual(
    ["basica", "media", "avanzada"].map(
      (d) => exercises.filter((e) => e.difficulty === d).length,
    ),
    [12, 16, 12],
  );
  for (const e of exercises) {
    assert.equal(e.hints.length, 2);
    assert.ok(e.statement && e.explanation && e.tags.length);
    assert.equal(
      grade(e.solution, e.solution, Object.keys(e.atoms)).status,
      "correct",
    );
  }
});

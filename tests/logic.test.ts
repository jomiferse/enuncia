import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseFormula, evaluate, formatFormula, grade } from "../src/logic.ts";
import {
  emptyProgress,
  readProgress,
  mergeProgress,
  exerciseStats,
  selectExam,
} from "../src/progress.ts";
import type { Exercise, Attempt } from "../src/types.ts";
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
    new URL("../src/content/formalizacion.json", import.meta.url),
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
test("simulacros equilibrados, sin duplicados y filtro de dificultad", () => {
  const ids = selectExam(exercises);
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
  assert.deepEqual(
    ["basica", "media", "avanzada"].map(
      (d) =>
        ids.filter((id) => exercises.find((e) => e.id === id)?.difficulty === d)
          .length,
    ),
    [3, 4, 3],
  );
  for (const d of ["basica", "media", "avanzada"] as const)
    assert.ok(
      selectExam(exercises, d).every(
        (id) => exercises.find((e) => e.id === id)?.difficulty === d,
      ),
    );
});
const attempt = (
  id: string,
  status: Attempt["status"],
  aided = false,
): Attempt => ({
  id,
  exerciseId: "enu-for-001",
  answer: "P",
  status,
  aided,
  timestamp: Number(id) + 1,
  mode: "practice",
});
test("historial, errores pendientes y primer acierto sin ayuda", () => {
  assert.ok(exerciseStats("enu-for-001", [attempt("1", "incorrect")]).pending);
  const stats = exerciseStats("enu-for-001", [
    attempt("1", "incorrect"),
    attempt("2", "correct"),
  ]);
  assert.ok(stats.solved);
  assert.ok(!stats.pending);
  assert.ok(!stats.firstUnaided);
  assert.ok(
    exerciseStats("enu-for-001", [attempt("1", "correct")]).firstUnaided,
  );
  assert.ok(
    !exerciseStats("enu-for-001", [
      attempt("1", "revealed", true),
      attempt("2", "correct"),
    ]).firstUnaided,
  );
});
test("exportación, validación e importación fusionada conservan IDs desconocidos", () => {
  const current = { ...emptyProgress(), attempts: [attempt("1", "correct")] };
  const incoming = {
    ...emptyProgress(),
    attempts: [
      attempt("1", "correct"),
      { ...attempt("2", "incorrect"), exerciseId: "futuro-001" },
    ],
  };
  const merged = mergeProgress(
    current,
    readProgress(JSON.parse(JSON.stringify(incoming))),
  );
  assert.equal(merged.attempts.length, 2);
  assert.ok(merged.attempts.some((a) => a.exerciseId === "futuro-001"));
  assert.throws(() => readProgress({ ...incoming, version: 2 }));
  assert.throws(() =>
    readProgress({
      ...incoming,
      attempts: [{ ...attempt("1", "correct"), timestamp: "ayer" }],
    }),
  );
  assert.throws(() =>
    readProgress({
      ...incoming,
      attempts: [attempt("1", "correct"), attempt("1", "correct")],
    }),
  );
});
test("un examen terminado no se resucita al importar", () => {
  const active = {
    id: "exam-1",
    exerciseIds: selectExam(exercises),
    answers: {},
    startedAt: 1,
  };
  const current = { ...emptyProgress(), exams: [{ ...active, finishedAt: 2 }] };
  assert.equal(
    mergeProgress(current, { ...emptyProgress(), activeExam: active })
      .activeExam,
    null,
  );
});

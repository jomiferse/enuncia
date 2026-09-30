import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { selectExam } from "../src/domain/exam/selection.ts";
import type { Attempt, Exercise } from "../src/domain/models";
import { emptyProgress, mergeProgress } from "../src/domain/progress/state.ts";
import { exerciseStats } from "../src/domain/progress/statistics.ts";
import { readProgress } from "../src/domain/progress/validation.ts";
const exercises = JSON.parse(
  readFileSync(
    new URL("../src/data/content/formalizacion.json", import.meta.url),
    "utf8",
  ),
) as Exercise[];
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

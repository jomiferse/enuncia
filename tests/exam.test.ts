import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { completeExam, examResults } from "../src/domain/exam/grading.ts";
import { selectExam } from "../src/domain/exam/selection.ts";
import type { Exercise } from "../src/domain/models";
const exercises = JSON.parse(
  readFileSync(
    new URL("../src/data/content/formalizacion.json", import.meta.url),
    "utf8",
  ),
) as Exercise[];
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

test("submission grades answers, records metadata and leaves the active exam immutable", () => {
  const pool = exercises.slice(0, 3);
  const exam = { id: "exam", exerciseIds: pool.map(e => e.id), answers: { [pool[0].id]: pool[0].solution, [pool[1].id]: "Z" }, startedAt: 1 };
  const before = structuredClone(exam);
  let id = 0;
  const { finished, attempts } = completeExam(exam, Object.fromEntries(pool.map(e => [e.id, e])), 50, () => `attempt-${++id}`);
  assert.deepEqual(exam, before);
  assert.equal(finished.finishedAt, 50);
  assert.deepEqual(attempts.map(a => a.status), ["correct", "invalid", "invalid"]);
  assert.equal(new Set(attempts.map(a => a.id)).size, 3);
  assert.ok(attempts.every(a => a.timestamp === 50 && a.mode === "exam" && a.examId === "exam" && !a.aided));
});
test("review retains missing exercise answers while submission rejects incomplete catalogs", () => {
  const exam = { id: "exam", exerciseIds: ["removed"], answers: { removed: "P" }, startedAt: 1 };
  assert.equal(examResults(exam, {})[0].result, null);
  assert.equal(exam.answers.removed, "P");
  assert.throws(() => completeExam(exam, {}, 50, () => "attempt"), /desconocido/);
});

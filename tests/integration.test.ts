import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { completeExam, isAnswered } from "../src/domain/exam/grading.ts";
import { selectExam } from "../src/domain/exam/selection.ts";
import { validateCatalog } from "../src/domain/exercises/validation.ts";
import type { Block, Exercise } from "../src/domain/models";
import { appendAttempt, emptyProgress } from "../src/domain/progress/state.ts";
import { readProgress } from "../src/domain/progress/validation.ts";

const dir = new URL("../src/data/content/", import.meta.url);
const read = <T>(name: string) => JSON.parse(readFileSync(new URL(name, dir), "utf8")) as T;
const blocks = read<Block[]>("blocks.json");
const exercises = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && !["blocks.json", "areas.json"].includes(f))
  .flatMap((f) => read<Exercise[]>(f));

test("every block has at least 20 exercises across the three difficulties and the catalog validates", () => {
  validateCatalog(blocks, exercises);
  for (const b of blocks) {
    const pool = exercises.filter((e) => e.blockId === b.id);
    assert.ok(pool.length >= 20, `${b.id} has ${pool.length}`);
    for (const d of ["basica", "media", "avanzada"]) assert.ok(pool.some((e) => e.difficulty === d), `${b.id} lacks ${d}`);
  }
});
test("mixed-type exams grade blank and wrong answers of every type without throwing", () => {
  const ids = selectExam(exercises);
  assert.equal(new Set(exercises.filter((e) => ids.includes(e.id)).map((e) => e.type)).size > 1, true);
  const byType = [...new Set(exercises.map((e) => e.type))].map((t) => exercises.find((e) => e.type === t)!);
  const byId = Object.fromEntries(byType.map((e) => [e.id, e]));
  const exam = { id: "x", exerciseIds: byType.map((e) => e.id), answers: { [byType[1].id]: "garbage ;;" }, startedAt: 1 };
  const { attempts } = completeExam(exam, byId, 5, () => crypto.randomUUID());
  assert.equal(attempts.length, byType.length);
  assert.ok(attempts.every((a) => a.status === "invalid" || a.status === "incorrect"));
});
test("long answers of new types survive progress validation", () => {
  const answer = "x".repeat(4000);
  const p = appendAttempt(emptyProgress(), { id: "1", exerciseId: "enu-ded-001", answer, status: "incorrect", aided: false, timestamp: 1, mode: "practice" });
  assert.equal(readProgress(JSON.parse(JSON.stringify(p))).attempts[0].answer, answer);
});
test("truth-table placeholders count as unanswered", () => {
  assert.equal(isAnswered("----"), false);
  assert.equal(isAnswered("-V--"), true);
  assert.equal(isAnswered("  "), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  exercisePage,
  filterExercisePool,
  summarizeExercises,
  validateCourse,
} from "../src/course.ts";
import type { Area, Attempt, Block, Exercise } from "../src/types.ts";
const read = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../src/content/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const areas = read("areas") as Area[],
  blocks = read("blocks") as Block[],
  exercises = read("formalizacion") as Exercise[];
const attempt = (
  exerciseId: string,
  status: Attempt["status"],
  timestamp: number,
): Attempt => ({
  id: `${exerciseId}-${timestamp}`,
  exerciseId,
  status,
  answer: "P",
  aided: false,
  timestamp,
  mode: "practice",
});
test("course structure retains the existing block and groups planned blocks by area", () => {
  assert.doesNotThrow(() => validateCourse(areas, blocks));
  assert.equal(
    blocks.find((b) => b.id === "enunciados-formalizacion")?.areaId,
    "enunciados",
  );
  assert.deepEqual(
    blocks.filter((b) => b.areaId === "enunciados").map((b) => b.subtitle),
    ["Formalización", "Deducción natural", "Resolución", "Tablas de verdad"],
  );
  assert.equal(blocks.filter((b) => b.areaId === "predicados").length, 3);
  assert.ok(
    exercises.every((e) =>
      blocks.some((b) => b.id === e.blockId && b.type === e.type),
    ),
  );
});
test("course structure rejects orphan blocks and duplicate areas", () => {
  assert.throws(() =>
    validateCourse(areas, [{ ...blocks[0], areaId: "missing" }]),
  );
  assert.throws(() => validateCourse([...areas, areas[0]], blocks));
  assert.throws(() => validateCourse(areas, [blocks[0], blocks[0]]));
});
test("block filtering never leaks exercises from another area, including all-level search", () => {
  const future = {
    ...exercises[0],
    id: "pred-fe-001",
    blockId: "predicados-formulas-enunciados",
  };
  const pool = filterExercisePool([...exercises, future], [], {
    blockId: "enunciados-formalizacion",
    difficulty: "all",
    query: "",
    errorsOnly: false,
  });
  assert.equal(pool.length, 40);
  assert.ok(!pool.some((e) => e.id === future.id));
  assert.equal(
    filterExercisePool([...exercises, future], [], {
      blockId: "predicados-formulas-enunciados",
      difficulty: "all",
      query: "",
      errorsOnly: false,
    }).length,
    1,
  );
  assert.equal(
    filterExercisePool(exercises, [], {
      blockId: "",
      difficulty: "all",
      query: "",
      errorsOnly: false,
    }).length,
    0,
  );
});
test("level selection, scoped review, and search work together", () => {
  const attempts = [
    attempt("enu-for-001", "incorrect", 1),
    attempt("enu-for-014", "incorrect", 2),
  ];
  const basic = filterExercisePool(exercises, attempts, {
    blockId: "enunciados-formalizacion",
    difficulty: "basica",
    query: "ACCIONES",
    errorsOnly: true,
  });
  assert.deepEqual(
    basic.map((e) => e.id),
    ["enu-for-001"],
  );
  const resolved = [...attempts, attempt("enu-for-001", "correct", 3)];
  assert.equal(
    filterExercisePool(exercises, resolved, {
      blockId: "enunciados-formalizacion",
      difficulty: "basica",
      query: "",
      errorsOnly: true,
    }).length,
    0,
  );
});
test("block counters partition the pool while review remains independent", () => {
  const pool = exercises.slice(0, 4);
  const attempts = [
    attempt(pool[0].id, "correct", 1),
    attempt(pool[0].id, "incorrect", 2),
    attempt(pool[1].id, "invalid", 3),
    attempt(pool[2].id, "revealed", 4),
    attempt("other-block", "correct", 5),
  ];
  assert.deepEqual(summarizeExercises(pool, attempts), {
    total: 4,
    complete: 1,
    incomplete: 2,
    untouched: 1,
    pending: 3,
  });
  assert.deepEqual(summarizeExercises([], attempts), {
    total: 0,
    complete: 0,
    incomplete: 0,
    untouched: 0,
    pending: 0,
  });
});
test("pagination limits the list, preserves order, and clamps after the pool shrinks", () => {
  const basic = exercises.filter((e) => e.difficulty === "basica");
  const first = exercisePage(basic, 0),
    second = exercisePage(basic, 1);
  assert.equal(first.items.length, 10);
  assert.equal(second.items.length, 2);
  assert.equal(second.count, 2);
  assert.deepEqual(
    [...first.items, ...second.items].map((e) => e.id),
    basic.map((e) => e.id),
  );
  assert.equal(exercisePage(basic.slice(0, 3), 8).page, 0);
  assert.deepEqual(exercisePage([], 5), { page: 0, count: 1, items: [] });
});

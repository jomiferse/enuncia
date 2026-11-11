import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { guidedResolution } from "../src/domain/exercises/types/guided-resolution.ts";
import { validateCatalog } from "../src/domain/exercises/validation.ts";
import type { GuidedExerciseData } from "../src/domain/logic/guided-types.ts";
import type { Block, Exercise } from "../src/domain/models.ts";

const dir = new URL("../src/data/content/", import.meta.url);
const read = <T>(name: string) => JSON.parse(readFileSync(new URL(name, dir), "utf8")) as T;
const blocks = read<Block[]>("blocks.json");
const exercises = read<Exercise[]>("predicados-resolucion.json");
const dataOf = (e: Exercise) => e.data as unknown as GuidedExerciseData;

test("the predicate resolution block validates with at least 20 exercises and three difficulties", () => {
  validateCatalog(blocks, exercises);
  assert.ok(exercises.length >= 20, `only ${exercises.length}`);
  for (const d of ["basica", "media", "avanzada"]) assert.ok(exercises.some((e) => e.difficulty === d), `no ${d}`);
  assert.ok(exercises.every((e) => e.blockId === "predicados-resolucion" && e.type === "resolution" && e.hints.length === 2));
  assert.ok(exercises.every((e) => dataOf(e).language === "predicate" && dataOf(e).premises.length >= 1 && dataOf(e).premises.length <= 4));
});

test("the exercises cover valid, invalid and inconsistent outcomes", () => {
  assert.ok(exercises.some((e) => dataOf(e).valid === false));
  assert.ok(exercises.some((e) => dataOf(e).consistent === false));
  assert.ok(exercises.filter((e) => dataOf(e).valid && dataOf(e).consistent).length >= 10);
  assert.ok(exercises.every((e) => dataOf(e).valid || dataOf(e).consistent), "invalid premises make every conclusion valid");
});

test("every reference answer is graded correct", () => {
  for (const e of exercises) assert.equal(guidedResolution.grade(JSON.stringify(dataOf(e).reference), e).status, "correct", e.id);
});

test("altered references are not correct", () => {
  for (const e of exercises) {
    const ref = dataOf(e).reference;
    const flipped = structuredClone(ref);
    flipped.valid = !ref.valid;
    assert.notEqual(guidedResolution.grade(JSON.stringify(flipped), e).status, "correct", `${e.id} valid flipped`);
    const noConsistency = structuredClone(ref);
    noConsistency.consistent = !ref.consistent;
    assert.notEqual(guidedResolution.grade(JSON.stringify(noConsistency), e).status, "correct", `${e.id} consistent flipped`);
    for (const phase of ["refute", "premisesPhase"] as const) {
      if (!ref[phase].tree.length) continue;
      const shorter = structuredClone(ref);
      shorter[phase].tree = shorter[phase].tree.slice(0, -1);
      assert.notEqual(guidedResolution.grade(JSON.stringify(shorter), e).status, "correct", `${e.id} ${phase} tree shortened`);
    }
  }
});

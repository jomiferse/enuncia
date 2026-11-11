import assert from "node:assert/strict";
import { test } from "node:test";
import { DomainError } from "../src/domain/errors.ts";
import { validateCatalog } from "../src/domain/exercises/validation.ts";
import type { Block, Exercise } from "../src/domain/models.ts";

const block: Block = { id: "b", areaId: "a", title: "t", subtitle: "s", type: "formalization", description: "d" };
const base: Exercise = {
  id: "x-001", blockId: "b", type: "formalization", difficulty: "basica", title: "T", tags: [],
  statement: "S", atoms: { P: "p" }, solution: "P", hints: ["a", "b"], explanation: "E",
};
const code = (e: Partial<Exercise>, b: Block = block) => {
  try { validateCatalog([b], [{ ...base, ...e }]); } catch (err) { return (err as DomainError).code; }
};
test("catalog validation delegates type-specific checks to the exercise type", () => {
  assert.equal(code({}), undefined);
  assert.equal(code({ atoms: {} }), "invalidAtoms");
  assert.equal(code({ type: "natural-deduction" }), "exerciseTypeMismatch");
  assert.equal(code({ type: "unknown" }, { ...block, type: "unknown" }), "unsupportedExerciseType");
  assert.equal(code({ blockId: "zzz" }), "unknownBlock");
});

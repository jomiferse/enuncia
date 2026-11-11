import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { guidedResolution } from "../src/domain/exercises/types/guided-resolution.ts";
import { validateCatalog } from "../src/domain/exercises/validation.ts";
import { evaluate } from "../src/domain/logic/evaluation.ts";
import type { GuidedAnswer, GuidedExerciseData } from "../src/domain/logic/guided-types.ts";
import { parseFormula } from "../src/domain/logic/parser.ts";
import type { Block, Exercise } from "../src/domain/models.ts";

const dir = new URL("../src/data/content/", import.meta.url);
const read = <T>(name: string) => JSON.parse(readFileSync(new URL(name, dir), "utf8")) as T;
const blocks = read<Block[]>("blocks.json");
const exercises = read<Exercise[]>("enunciados-resolucion.json");
const dataOf = (e: Exercise) => e.data as unknown as GuidedExerciseData;
const grade = (answer: GuidedAnswer, e: Exercise) => guidedResolution.grade(JSON.stringify(answer), e).status;

/** Validez y consistencia por tabla de verdad. */
function semantics(d: GuidedExerciseData) {
  const atoms = d.atoms ?? [];
  const premises = d.premises.map((p) => parseFormula(p, atoms));
  const conclusion = parseFormula(d.conclusion, atoms);
  let consistent = false;
  let valid = true;
  for (let mask = 0; mask < 1 << atoms.length; mask++) {
    const row = Object.fromEntries(atoms.map((a, i) => [a, Boolean(mask & (1 << i))]));
    if (!premises.every((p) => evaluate(p, row))) continue;
    consistent = true;
    if (!evaluate(conclusion, row)) valid = false;
  }
  return { valid, consistent };
}

test("the propositional resolution block validates with at least 20 exercises and three difficulties", () => {
  assert.doesNotThrow(() => validateCatalog(blocks, exercises));
  assert.ok(exercises.length >= 20, `only ${exercises.length}`);
  for (const d of ["basica", "media", "avanzada"]) assert.ok(exercises.some((e) => e.difficulty === d), `missing ${d}`);
  assert.ok(exercises.every((e, i) => e.id === `enu-res-${String(i + 1).padStart(3, "0")}` && e.blockId === "enunciados-resolucion" && e.type === "resolution"));
  assert.ok(exercises.every((e) => e.hints.length === 2 && dataOf(e).language === "propositional" && dataOf(e).premises.length <= 5));
});

test("every reference solution is graded as correct", () => {
  for (const e of exercises) {
    const d = dataOf(e);
    assert.equal(guidedResolution.grade(JSON.stringify(d.reference), e).status, "correct", e.id);
  }
});

test("altered references are never correct", () => {
  for (const e of exercises) {
    const ref = dataOf(e).reference;
    const flipValid = structuredClone(ref);
    flipValid.valid = !flipValid.valid;
    assert.notEqual(grade(flipValid, e), "correct", `${e.id} valid flipped`);
    const flipConsistent = structuredClone(ref);
    flipConsistent.consistent = !flipConsistent.consistent;
    assert.notEqual(grade(flipConsistent, e), "correct", `${e.id} consistent flipped`);
    const flipPossible = structuredClone(ref);
    flipPossible.refute.possible = !flipPossible.refute.possible;
    assert.notEqual(grade(flipPossible, e), "correct", `${e.id} possible flipped`);
    if (ref.refute.tree.length) {
      const cut = structuredClone(ref);
      cut.refute.tree = cut.refute.tree.slice(0, -1);
      assert.notEqual(grade(cut, e), "correct", `${e.id} tree cut`);
    }
    if (ref.premisesPhase.tree.length) {
      const cut = structuredClone(ref);
      cut.premisesPhase.tree = cut.premisesPhase.tree.slice(0, -1);
      assert.notEqual(grade(cut, e), "correct", `${e.id} premises tree cut`);
    }
    const noFnc = structuredClone(ref);
    noFnc.nf.negConclusion = noFnc.nf.negConclusion.slice(0, -1);
    assert.notEqual(grade(noFnc, e), "correct", `${e.id} missing FNC`);
  }
});

test("the block mixes valid, invalid, consistent and inconsistent reasonings, with the reference matching the truth table", () => {
  const facts = exercises.map((e) => ({ e, ...semantics(dataOf(e)) }));
  assert.ok(facts.some((f) => !f.valid), "needs invalid reasonings");
  assert.ok(facts.some((f) => !f.consistent), "needs inconsistent premises");
  assert.ok(facts.some((f) => f.valid && f.consistent), "needs valid reasonings with consistent premises");
  assert.ok(facts.filter((f) => f.valid && f.consistent).length > facts.length / 2, "most should be valid and consistent");
  for (const f of facts) {
    const ref = dataOf(f.e).reference;
    assert.equal(ref.valid, f.valid, `${f.e.id} valid`);
    assert.equal(ref.consistent, f.consistent, `${f.e.id} consistent`);
    assert.equal(ref.refute.possible, f.valid, `${f.e.id} refutation possible`);
    assert.equal(ref.premisesPhase.possible, !f.consistent, `${f.e.id} premises refutation possible`);
  }
});

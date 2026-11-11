import assert from "node:assert/strict";
import { test } from "node:test";
import { guidedResolution } from "../src/domain/exercises/types/guided-resolution.ts";
import { contextOf, evaluateGuided, parseGuidedAnswer, serializeGuidedAnswer, startFormulas } from "../src/domain/logic/guided.ts";
import { type GuidedAnswer, type GuidedExerciseData, emptyGuidedAnswer } from "../src/domain/logic/guided-types.ts";
import type { Exercise } from "../src/domain/models.ts";

const reference: GuidedAnswer = {
  nf: { premises: [[{ law: "imp", result: "¬P ∨ Q" }, { law: "fnc", result: "" }], [{ law: "fnc", result: "" }]], negConclusion: [{ law: "fnc", result: "" }] },
  refute: {
    simplify: [{ kind: "none", result: "" }],
    possible: true,
    tree: [
      { trunk: 0, side: 2, trunkLiteral: "Q", sideLiteral: "¬Q" },
      { trunk: 3, side: 1, trunkLiteral: "¬P", sideLiteral: "P" },
    ],
  },
  valid: true,
  premisesPhase: { simplify: [{ kind: "pure", result: "{P}" }, { kind: "pure", result: "∅" }, { kind: "none", result: "" }], possible: false, tree: [] },
  consistent: true,
};
const data: GuidedExerciseData = { language: "propositional", premises: ["P → Q", "P"], conclusion: "Q", atoms: ["P", "Q"], reference };
const exercise = { id: "t-001", blockId: "b", type: "resolution", difficulty: "basica", title: "t", tags: [], statement: "s", hints: ["a", "b"], explanation: "e", data } as unknown as Exercise;

test("a complete reference answer is correct in every phase", () => {
  const ev = evaluateGuided(parseGuidedAnswer(JSON.stringify(reference)), data);
  assert.deepEqual(startFormulas(data), ["P → Q", "P", "¬Q"]);
  assert.equal(ev.correct, true, JSON.stringify(ev, null, 1));
  assert.doesNotThrow(() => guidedResolution.validate(exercise));
});
test("blank, unreadable and incomplete answers are invalid", () => {
  assert.equal(guidedResolution.grade("", exercise).status, "invalid");
  assert.equal(guidedResolution.grade("{oops", exercise).status, "invalid");
  const partial = emptyGuidedAnswer(2);
  partial.nf.premises[0] = [{ law: "imp", result: "¬P ∨ Q" }];
  const g = guidedResolution.grade(serializeGuidedAnswer(partial), exercise);
  assert.equal(g.status, "invalid");
  assert.equal(g.messageCode, "guided.incomplete");
});
test("a wrong law is incorrect and locks the following phases", () => {
  const wrong = structuredClone(reference);
  wrong.nf.premises[0][0] = { law: "deMorganAnd", result: "¬P ∨ Q" };
  const g = guidedResolution.grade(JSON.stringify(wrong), exercise);
  assert.equal(g.status, "incorrect");
  assert.ok(g.details?.[0].includes("premisa 1"));
  const ev = evaluateGuided(wrong, data);
  assert.equal(ev.refute, null);
});
test("wrong verdicts and wrong tree answers are rejected", () => {
  const w1 = structuredClone(reference); w1.refute.possible = false;
  assert.equal(guidedResolution.grade(JSON.stringify(w1), exercise).status, "incorrect");
  const w2 = structuredClone(reference); w2.valid = false;
  assert.equal(guidedResolution.grade(JSON.stringify(w2), exercise).status, "incorrect");
  const w3 = structuredClone(reference); w3.consistent = false;
  assert.equal(guidedResolution.grade(JSON.stringify(w3), exercise).status, "incorrect");
  const w4 = structuredClone(reference); w4.refute.tree = w4.refute.tree.slice(0, 1);
  assert.notEqual(guidedResolution.grade(JSON.stringify(w4), exercise).status, "correct");
});
test("validate rejects a failing reference and bad data", () => {
  const broken = structuredClone(exercise) as Exercise;
  (broken.data as { reference: GuidedAnswer }).reference = { ...reference, valid: false };
  assert.throws(() => guidedResolution.validate(broken));
  assert.throws(() => guidedResolution.validate({ ...exercise, data: { ...data, premises: [] } } as unknown as Exercise));
  assert.equal(contextOf(data).language, "propositional");
});

test("predicate flow: universal premise, ground fact and ground conclusion", () => {
  const ref: GuidedAnswer = {
    nf: {
      premises: [[{ law: "imp", result: "∀x (¬P(x) ∨ Q(x))" }, { law: "fns", result: "" }], [{ law: "fns", result: "" }]],
      negConclusion: [{ law: "fns", result: "" }],
    },
    refute: {
      simplify: [{ kind: "none", result: "" }],
      possible: true,
      tree: [
        { trunk: 0, side: 2, trunkLiteral: "Q(x)", sideLiteral: "¬Q(a)" },
        { trunk: 3, side: 1, trunkLiteral: "¬P(a)", sideLiteral: "P(a)" },
      ],
    },
    valid: true,
    premisesPhase: { simplify: [{ kind: "pure", result: "{P(a)}" }, { kind: "pure", result: "∅" }, { kind: "none", result: "" }], possible: false, tree: [] },
    consistent: true,
  };
  const d: GuidedExerciseData = {
    language: "predicate",
    premises: ["∀x (P(x) → Q(x))", "P(a)"],
    conclusion: "Q(a)",
    signature: { predicates: [{ name: "P", arity: 1 }, { name: "Q", arity: 1 }], constants: [{ name: "a" }] },
    valid: true,
    consistent: true,
    reference: ref,
  };
  const ev = evaluateGuided(ref, d);
  assert.equal(ev.correct, true, JSON.stringify(ev, null, 1));
});

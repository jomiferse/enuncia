import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "../src/shared/i18n/config.ts";
import type { GuidedAnswer, GuidedEvaluation, GuidedExerciseData } from "../src/domain/logic/guided-types.ts";
import { emptyGuidedAnswer } from "../src/domain/logic/guided-types.ts";
import type { Exercise } from "../src/domain/models.ts";
import { makeContext, splitLiterals, normalizeAnswer, isBlankAnswer } from "../src/shared/components/exercises/types/guided-resolution/catalog.ts";
import { GuidedPhases } from "../src/shared/components/exercises/types/guided-resolution/GuidedPhases.tsx";
import { guidedResolutionUi } from "../src/shared/components/exercises/types/guided-resolution.tsx";

const reference: GuidedAnswer = {
  nf: {
    premises: [[{ law: "imp", result: "¬P ∨ Q" }, { law: "fnc", result: "" }], [{ law: "fnc", result: "" }]],
    negConclusion: [{ law: "fnc", result: "" }],
  },
  refute: { simplify: [{ kind: "none", result: "" }], possible: true, tree: [{ trunk: 0, side: 1, trunkLiteral: "¬P", sideLiteral: "P" }] },
  valid: true,
  premisesPhase: { simplify: [], possible: false, tree: [] },
  consistent: true,
};
const propositional: GuidedExerciseData = {
  language: "propositional",
  premises: ["P -> Q", "P"],
  conclusion: "Q",
  atoms: ["P", "Q"],
  reference,
};
const predicate: GuidedExerciseData = {
  language: "predicate",
  premises: ["∀x(P(x) → Q(x))", "P(a)"],
  conclusion: "Q(a)",
  signature: { predicates: [{ name: "P", arity: 1, reading: "es par" }, { name: "Q", arity: 1, reading: "es entero" }], constants: [{ name: "a", reading: "el número a" }] },
  valid: true,
  consistent: true,
  reference,
} as unknown as GuidedExerciseData;

const exercise = (data: GuidedExerciseData): Exercise =>
  ({ id: "r-01", type: "resolution", title: "Modus ponens", statement: "Decide la validez.", difficulty: "fácil", hints: ["a", "b"], explanation: "Explicación.", data } as unknown as Exercise);

const phase = (): GuidedEvaluation["refute"] => ({
  startSet: ["{¬P, Q}", "{P}", "{¬Q}"],
  simplify: [{ ok: true }],
  simplified: true,
  finalSet: ["{¬P, Q}", "{P}", "{¬Q}"],
  possible: { ok: true },
  tree: [{ ok: false, code: "incorrectFormula" }],
  available: ["{¬P, Q}", "{P}", "{¬Q}"],
  complete: false,
});
const evaluation: GuidedEvaluation = {
  nf: { premises: [[{ ok: true }, { ok: true }], [{ ok: false, code: "incorrectFormula" }]], negConclusion: [], startFormulas: ["P → Q", "P", "¬Q"], complete: false },
  refute: phase(),
  valid: null,
  premisesPhase: null,
  consistent: null,
  correct: false,
  blank: false,
};

for (const [name, data] of [["enunciados", propositional], ["predicados", predicate]] as const) {
  test(`guided resolution UI renders statement, solution and editor (${name})`, () => {
    const ui = guidedResolutionUi;
    const e = exercise(data);
    assert.match(renderToStaticMarkup(createElement(ui.Statement, { exercise: e })), /Premisas/);
    assert.match(renderToStaticMarkup(createElement(ui.Solution, { exercise: e })), /Solución explicada/);
    const empty = renderToStaticMarkup(createElement(ui.Editor, { exercise: e, value: "", onChange: () => undefined }));
    assert.match(empty, /Añadir paso/);
    assert.match(empty, /class="gr-add"[^>]*aria-expanded="false"/);
    assert.doesNotMatch(empty, /Editar paso/);
    assert.match(renderToStaticMarkup(createElement(ui.Editor, { exercise: e, value: JSON.stringify(reference), onChange: () => undefined, preview: false })), /Quitar último paso/);
    assert.doesNotThrow(() => renderToStaticMarkup(createElement(ui.Editor, { exercise: e, value: "{no json", onChange: () => undefined })));
  });
}

test("phases show per-step status only with feedback and keep later phases locked", () => {
  const noop = () => undefined;
  const withFeedback = renderToStaticMarkup(createElement(GuidedPhases, { ctx: makeContext(propositional, { preview: true }), answer: reference, evaluation, onAnswer: noop }));
  assert.match(withFeedback, /Correcto/);
  assert.match(withFeedback, /Bloqueada/);
  assert.match(withFeedback, /Resolvente/);
  const exam = renderToStaticMarkup(createElement(GuidedPhases, { ctx: makeContext(propositional, { preview: false }), answer: reference, evaluation, onAnswer: noop }));
  assert.doesNotMatch(exam, /Correcto|Bloqueada/);
  assert.match(exam, /Añadir paso/);
});

test("catalog helpers split literals and normalize answers", () => {
  assert.deepEqual(splitLiterals("{¬P, Q(x, y), R}"), ["¬P", "Q(x, y)", "R"]);
  assert.deepEqual(splitLiterals("A ∨ ¬B"), ["A", "¬B"]);
  assert.deepEqual(splitLiterals("□"), []);
  assert.ok(isBlankAnswer(normalizeAnswer(null, 2)));
  assert.ok(isBlankAnswer(normalizeAnswer(emptyGuidedAnswer(2), 2)));
  assert.ok(!isBlankAnswer(normalizeAnswer(reference, 2)));
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { DomainError } from "../src/domain/errors.ts";
import { exerciseTypes } from "../src/domain/exercises/registry.ts";
import {
  availableRules,
  readNaturalDeductionData,
} from "../src/domain/exercises/types/natural-deduction.ts";
import { validateCatalog } from "../src/domain/exercises/validation.ts";
import { checkProofWith, previewProofWith, canonicalRule } from "../src/domain/logic/deduction.ts";
import { predicateSystem } from "../src/domain/logic/predicate-deduction.ts";
import type { PredicateSignature } from "../src/domain/logic/predicates.ts";
import type { Block, Exercise } from "../src/domain/models.ts";
import blocksData from "../src/data/content/blocks.json" with { type: "json" };
import propositionalData from "../src/data/content/enunciados-deduccion-natural.json" with { type: "json" };
import predicateData from "../src/data/content/predicados-deduccion-natural.json" with { type: "json" };
import { MAX_ANSWER_LENGTH } from "../src/domain/logic/limits.ts";
import { i18n } from "../src/shared/i18n/config.ts";
import { translateGrade } from "../src/shared/i18n/messages.ts";

const blocks = blocksData as Block[];
const propositional = propositionalData as unknown as Exercise[];
const predicate = predicateData as unknown as Exercise[];

// ---------------------------------------------------------------- reglas de predicados

const signature: PredicateSignature = { predicates: { P: 1, Q: 1, R: 2, S: 0 }, constants: ["a", "b"] };
const sys = predicateSystem(signature);
const run = (proof: string[], premises: string[], conclusion: string, rules?: string[]) =>
  checkProofWith(sys, proof.join("\n"), { premises, conclusion, atoms: [], rules });
const ok = (proof: string[], premises: string[], conclusion: string) => {
  const r = run(proof, premises, conclusion);
  assert.equal(r.status, "correct", r.message);
};
const bad = (proof: string[], premises: string[], conclusion: string, line: number, code: string, params?: Record<string, string | number>) => {
  const r = run(proof, premises, conclusion);
  assert.equal(r.status, "incorrect", r.message);
  assert.equal(r.line, line, r.message);
  assert.equal(r.messageCode, code, r.message);
  if (params) for (const [k, v] of Object.entries(params)) assert.equal(r.messageParams?.[k], v, `${k}: ${r.message}`);
  assert.ok(i18n.exists(`errors.${r.messageCode}`), `missing translation for ${r.messageCode}`);
};

test("nombres de reglas de cuantificadores", () => {
  for (const [name, rule] of [["∀E", "∀E"], ["forallI", "∀I"], ["allE", "∀E"], ["∃I", "∃I"], ["existsE", "∃E"], ["exI", "∃I"], ["∃-elim", "∃E"]])
    assert.equal(canonicalRule(name), rule, name);
});

test("∀E: instancia con constantes y variables", () => {
  ok(["1. ∀x P(x) ; Premisa", "2. P(a) ; ∀E ; 1"], ["∀x P(x)"], "P(a)");
  ok(["1. ∀x P(x) ; Premisa", "2. P(x) ; ∀E ; 1"], ["∀x P(x)"], "P(x)");
  ok(["1. ∀x ∀y R(x, y) ; Premisa", "2. ∀y R(a, y) ; ∀E ; 1", "3. R(a, b) ; ∀E ; 2"], ["∀x ∀y R(x, y)"], "R(a, b)");
  // Cuantificador vacuo: cualquier término.
  ok(["1. ∀x S ; Premisa", "2. S ; ∀E ; 1"], ["∀x S"], "S");
  bad(["1. ∀x P(x) ; Premisa", "2. Q(a) ; ∀E ; 1"], ["∀x P(x)"], "Q(a)", 2, "deduction.lineRule");
  bad(["1. ∃x P(x) ; Premisa", "2. P(a) ; ∀E ; 1"], ["∃x P(x)"], "P(a)", 2, "deduction.lineRule");
  // Términos incoherentes: x sustituida por a en un sitio y por b en otro.
  bad(["1. ∀x R(x, x) ; Premisa", "2. R(a, b) ; ∀E ; 1"], ["∀x R(x, x)"], "R(a, b)", 2, "deduction.lineRule");
});

test("∀E y ∃I: sustitución libre (captura de variables)", () => {
  bad(["1. ∀x ∃y R(x, y) ; Premisa", "2. ∃y R(y, y) ; ∀E ; 1"], ["∀x ∃y R(x, y)"], "∃y R(y, y)", 2, "deduction.captured", { term: "y" });
  ok(["1. ∀x ∃y R(x, y) ; Premisa", "2. ∃y R(a, y) ; ∀E ; 1"], ["∀x ∃y R(x, y)"], "∃y R(a, y)");
  bad(["1. ∀y R(y, y) ; Premisa", "2. ∃x ∀y R(x, y) ; ∃I ; 1"], ["∀y R(y, y)"], "∃x ∀y R(x, y)", 2, "deduction.captured", { term: "y" });
});

test("∃I", () => {
  ok(["1. P(a) ; Premisa", "2. ∃x P(x) ; ∃I ; 1"], ["P(a)"], "∃x P(x)");
  ok(["1. R(a, a) ; Premisa", "2. ∃x R(x, a) ; ∃I ; 1", "3. ∃x R(x, x) ; ∃I ; 1", "4. ∃y R(y, a) ; ∃I ; 1"], ["R(a, a)"], "∃y R(y, a)");
  bad(["1. P(a) ; Premisa", "2. ∃x Q(x) ; ∃I ; 1"], ["P(a)"], "∃x Q(x)", 2, "deduction.lineRule");
  bad(["1. P(a) ; Premisa", "2. ∀x P(x) ; ∃I ; 1"], ["P(a)"], "∀x P(x)", 2, "deduction.lineRule");
  bad(["1. R(a, b) ; Premisa", "2. ∃x R(x, x) ; ∃I ; 1"], ["R(a, b)"], "∃x R(x, x)", 2, "deduction.lineRule");
});

test("∀I: eigenvariable", () => {
  ok(["1. ∀x P(x) ; Premisa", "2. P(y) ; ∀E ; 1", "3. ∀z P(z) ; ∀I ; 2"], ["∀x P(x)"], "∀x P(x)");
  ok(["1. ∀x (P(x) ∧ Q(x)) ; Premisa", "2. P(x) ∧ Q(x) ; ∀E ; 1", "3. P(x) ; ∧E ; 2", "4. ∀x P(x) ; ∀I ; 3"], ["∀x (P(x) ∧ Q(x))"], "∀x P(x)");
  // Generalizar sobre una variable libre en una premisa.
  bad(["1. P(x) ; Premisa", "2. ∀x P(x) ; ∀I ; 1"], ["P(x)"], "∀x P(x)", 2, "deduction.eigenPremise", { variable: "x" });
  // ... o libre en una hipótesis abierta.
  bad(["1. > P(x) ; Hipótesis", "2. > ∀x P(x) ; ∀I ; 1", "3. P(x) → ∀x P(x) ; →I ; 1-2"], [], "P(x) → ∀x P(x)", 2, "deduction.eigenHypothesis", { variable: "x", hypothesis: 1 });
  // Una hipótesis ya cerrada no restringe.
  ok(["1. > P(x) ; Hipótesis", "2. > P(x) ; Reiteración ; 1", "3. P(x) → P(x) ; →I ; 1-2", "4. ∀x (P(x) → P(x)) ; ∀I ; 3"], [], "∀x (P(x) → P(x))");
  // Constante en lugar de variable.
  bad(["1. P(a) ; Premisa", "2. ∀x P(x) ; ∀I ; 1"], ["P(a)"], "∀x P(x)", 2, "deduction.notVariable", { term: "a" });
  // La variable arbitraria no puede quedar libre en el resultado.
  bad(["1. R(y, y) ; Premisa", "2. ∀x R(x, y) ; ∀I ; 1"], ["R(y, y)"], "∀x R(x, y)", 2, "deduction.eigenQuantified", { variable: "y" });
  bad(["1. P(a) ; Premisa", "2. ∀x Q(x) ; ∀I ; 1"], ["P(a)"], "∀x Q(x)", 2, "deduction.lineRule");
});

test("∃E: variable nueva y subprueba", () => {
  const base = ["1. ∃x P(x) ; Premisa", "2. > P(y) ; Hipótesis", "3. > ∃z P(z) ; ∃I ; 2", "4. ∃z P(z) ; ∃E ; 1, 2-3"];
  ok(base, ["∃x P(x)"], "∃x P(x)");
  ok(["1. ∃x (P(x) ∧ Q(x)) ; Premisa", "2. > P(x) ∧ Q(x) ; Hipótesis", "3. > P(x) ; ∧E ; 2", "4. > ∃x P(x) ; ∃I ; 3", "5. ∃x P(x) ; ∃E ; 1, 2-4"], ["∃x (P(x) ∧ Q(x))"], "∃x P(x)");
  // Conclusión con la variable libre.
  bad(["1. ∃x P(x) ; Premisa", "2. > P(x) ; Hipótesis", "3. > P(x) ; Reiteración ; 2", "4. P(x) ; ∃E ; 1, 2-3"], ["∃x P(x)"], "P(x)", 4, "deduction.eigenConclusion", { variable: "x" });
  // Libre en una premisa.
  bad(["1. ∃x P(x) ; Premisa", "2. Q(x) ; Premisa", "3. > P(x) ; Hipótesis", "4. > P(x) ∧ Q(x) ; ∧I ; 3, 2", "5. > ∃x (P(x) ∧ Q(x)) ; ∃I ; 4", "6. ∃x (P(x) ∧ Q(x)) ; ∃E ; 1, 3-5"], ["∃x P(x)", "Q(x)"], "∃x (P(x) ∧ Q(x))", 6, "deduction.eigenPremise", { variable: "x" });
  // Libre en otra hipótesis abierta.
  bad(["1. ∃x P(x) ; Premisa", "2. > Q(x) ; Hipótesis", "3. > > P(x) ; Hipótesis", "4. > > ∃x P(x) ; ∃I ; 3", "5. > ∃x P(x) ; ∃E ; 1, 3-4"], ["∃x P(x)"], "∃x P(x)", 5, "deduction.eigenHypothesis", { variable: "x", hypothesis: 2 });
  // Libre en la fórmula existencial citada.
  bad(["1. ∃x R(x, y) ; Premisa", "2. > R(y, y) ; Hipótesis", "3. > ∃x R(x, x) ; ∃I ; 2", "4. ∃x R(x, x) ; ∃E ; 1, 2-3"], ["∃x R(x, y)"], "∃x R(x, x)", 4, "deduction.eigenQuantified", { variable: "y" });
  // La hipótesis debe ser una instancia con variable, no una constante.
  bad(["1. ∃x P(x) ; Premisa", "2. > P(a) ; Hipótesis", "3. > ∃x P(x) ; ∃I ; 2", "4. ∃x P(x) ; ∃E ; 1, 2-3"], ["∃x P(x)"], "∃x P(x)", 4, "deduction.notVariable", { term: "a" });
  // La subprueba debe acabar en el resultado.
  bad(["1. ∃x P(x) ; Premisa", "2. > P(x) ; Hipótesis", "3. > ∃x P(x) ; ∃I ; 2", "4. Q(a) ; ∃E ; 1, 2-3"], ["∃x P(x)"], "Q(a)", 4, "deduction.lineRule");
  // Citas: hace falta una línea ∃ y una subprueba.
  bad(["1. ∃x P(x) ; Premisa", "2. ∃x P(x) ; ∃E ; 1"], ["∃x P(x)"], "∃x P(x)", 2, "deduction.citeCount");
  bad(["1. ∀x P(x) ; Premisa", "2. > P(x) ; Hipótesis", "3. > ∃x P(x) ; ∃I ; 2", "4. ∃x P(x) ; ∃E ; 1, 2-3"], ["∀x P(x)"], "∃x P(x)", 4, "deduction.lineRule");
});

test("reglas fuera del sistema o no permitidas, y ⊥", () => {
  const prem = ["1. ∀x P(x) ; Premisa", "2. P(a) ; ∀E ; 1"];
  assert.equal(run(prem, ["∀x P(x)"], "P(a)", ["∃I"]).messageCode, "deduction.ruleNotAllowed");
  ok(["1. ∀x P(x) ; Premisa", "2. ¬∀x P(x) ; Premisa", "3. ⊥ ; ¬E ; 1, 2", "4. Q(a) ; ⊥E ; 3"], ["∀x P(x)", "¬∀x P(x)"], "Q(a)");
  ok(["1. ∃x P(x) ; Premisa", "2. ∃y P(y) ; Reiteración ; 1"], ["∃x P(x)"], "∃x P(x)");
  assert.equal(run(["1. Z(a) ; Premisa"], ["P(a)"], "P(a)").status, "invalid");
  assert.equal(run(["1. P(a) ; Premisa", "2. P(b) ; Premisa"], ["P(a)"], "P(b)").messageCode, "deduction.premiseNotGiven");
});

test("demostraciones completas de predicados", () => {
  // ∀x (P(x) → Q(x)), ∃x P(x) ⊢ ∃x Q(x)
  ok(
    ["1. ∀x (P(x) → Q(x)) ; Premisa", "2. ∃x P(x) ; Premisa", "3. > P(x) ; Hipótesis", "4. > P(x) → Q(x) ; ∀E ; 1", "5. > Q(x) ; →E ; 4, 3", "6. > ∃x Q(x) ; ∃I ; 5", "7. ∃x Q(x) ; ∃E ; 2, 3-6"],
    ["∀x (P(x) → Q(x))", "∃x P(x)"],
    "∃x Q(x)",
  );
  // ¬∀x P(x) ⊢ ∃x ¬P(x)
  ok(
    ["1. ¬∀x P(x) ; Premisa", "2. > ¬∃x ¬P(x) ; Hipótesis", "3. > > ¬P(x) ; Hipótesis", "4. > > ∃x ¬P(x) ; ∃I ; 3", "5. > > ⊥ ; ¬E ; 4, 2", "6. > P(x) ; RAA ; 3-5", "7. > ∀x P(x) ; ∀I ; 6", "8. > ⊥ ; ¬E ; 7, 1", "9. ∃x ¬P(x) ; RAA ; 2-8"],
    ["¬∀x P(x)"],
    "∃x ¬P(x)",
  );
  // La conclusión se compara módulo α.
  ok(["1. ∀x P(x) ; Premisa"], ["∀x P(x)"], "∀y P(y)");
});

test("vista previa de la demostración", () => {
  const p = previewProofWith(sys, "1. ∀x  P( x ) ; Premisa\n2. > Z(a) ; Hip\n3. P(a) ; ∀E ; 1", []);
  assert.equal(p.lines[0].formula, "∀x P(x)");
  assert.equal(p.lines[1].depth, 1);
  assert.ok(p.lines[1].formulaError instanceof DomainError);
  assert.equal(p.lines[2].citations, "1");
  assert.equal(previewProofWith(sys, "1. P(a) Premisa", []).error?.messageCode, "deduction.lineSyntax");
  assert.equal(previewProofWith(sys, "  ", []).error?.messageCode, "deduction.empty");
});

// ---------------------------------------------------------------- contenido y tipo de ejercicio

const blockOf = (id: string) => blocks.filter((b) => b.id === id);

for (const [blockId, prefix, list, language] of [
  ["enunciados-deduccion-natural", "enu-ded-", propositional, "propositional"],
  ["predicados-deduccion-natural", "pre-ded-", predicate, "predicate"],
] as const) {
  test(`bloque ${blockId}: catálogo, contenido y demostraciones de autor`, () => {
    assert.ok(list.length >= 20);
    assert.doesNotThrow(() => validateCatalog(blockOf(blockId), list));
    assert.deepEqual(new Set(list.map((e) => e.difficulty)), new Set(["basica", "media", "avanzada"]));
    list.forEach((e, i) => {
      assert.equal(e.id, `${prefix}${String(i + 1).padStart(3, "0")}`);
      assert.equal(e.blockId, blockId);
      assert.equal(e.type, "natural-deduction");
      assert.equal(e.data?.language, language);
      const data = readNaturalDeductionData(e);
      const proof = data.proof.join("\n");
      const type = exerciseTypes["natural-deduction"];
      const good = type.grade(proof, e);
      assert.equal(good.status, "correct", `${e.id}: ${good.message}`);
      assert.equal(translateGrade(good), i18n.t("errors.deduction.correct"));
      // Vacía o alterada: nunca correcta, y siempre con mensaje en español.
      const empty = type.grade("", e);
      assert.equal(empty.status, "invalid");
      assert.equal(type.grade("   \n ", e).status, "invalid");
      const withoutLast = data.proof.slice(0, -1).join("\n");
      if (withoutLast) assert.notEqual(type.grade(withoutLast, e).status, "correct", `${e.id}: sin la última línea`);
      const lines = data.proof.slice();
      const rule = lines.findIndex((l) => !/Premisa|Hipótesis/.test(l));
      lines[rule] = lines[rule].replace(/;[^;]*(;[^;]*)?$/, "; ⊥E ; 1");
      assert.notEqual(type.grade(lines.join("\n"), e).status, "correct", `${e.id}: regla alterada`);
      for (const r of [empty, type.grade(withoutLast, e), type.grade(lines.join("\n"), e)]) {
        assert.ok(i18n.exists(`errors.${r.messageCode}`), `${e.id}: ${r.messageCode}`);
        assert.ok(translateGrade(r).length > 0);
      }
      assert.ok(availableRules(data).length > 0);
    });
  });
}

test("un enunciado de predicados sin premisas ni reglas restringidas y respuestas alternativas válidas", () => {
  const e = propositional[0];
  const alt = ["1. P → Q ; Premisa", "2. P ; Premisa", "3. Q → R ; Premisa", "4. Q ; →E ; 1, 2", "5. R ; →E ; 3, 4"];
  assert.equal(exerciseTypes["natural-deduction"].grade(alt.join("\n"), e).status, "correct");
  const usesForbidden = ["1. P ; Premisa", "2. P ∨ R ; ∨I ; 1"];
  assert.equal(exerciseTypes["natural-deduction"].grade(usesForbidden.join("\n"), e).status, "incorrect");
  assert.equal(exerciseTypes["natural-deduction"].grade("x".repeat(MAX_ANSWER_LENGTH + 1), e).messageCode, "deduction.tooLong");
});

test("validate rechaza datos incompletos y demostraciones de autor incorrectas", () => {
  const e = predicate[0];
  const code = (patch: Record<string, unknown>) => {
    try {
      validateCatalog(blockOf("predicados-deduccion-natural"), [{ ...e, data: { ...(e.data as object), ...patch } }]);
    } catch (err) {
      return (err as DomainError).code;
    }
  };
  assert.equal(code({}), undefined);
  assert.equal(code({ language: "otra" }), "deduction.invalidData");
  assert.equal(code({ proof: [] }), "deduction.invalidData");
  assert.equal(code({ signature: undefined }), "deduction.invalidData");
  assert.equal(code({ rules: ["Magia"] }), "deduction.invalidData");
  assert.equal(code({ proof: ["1. ∀x P(x) ; Premisa", "2. P(a) ; ∀E ; 1", "3. P(b) ; ∀E ; 1"] }), "deduction.authorProofFails");
  assert.equal(code({ proof: ["1. ∀x P(x) ; Premisa"] }), "deduction.authorProofFails");
  assert.notEqual(code({ conclusion: "P(" }), undefined);
  assert.notEqual(code({ premises: ["Z(a)"] }), undefined);
  const prop = propositional[0];
  const noAtoms = { ...prop, data: { ...(prop.data as object), atoms: {} } };
  assert.throws(() => validateCatalog(blockOf("enunciados-deduccion-natural"), [noAtoms]), (err) => (err as DomainError).code === "deduction.invalidData");
  assert.ok(i18n.exists("errors.deduction.invalidData"));
  assert.ok(i18n.exists("errors.deduction.authorProofFails"));
});

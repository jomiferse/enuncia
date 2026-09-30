import assert from "node:assert/strict";
import { test } from "node:test";
import { DomainError } from "../src/domain/errors.ts";
import { grade } from "../src/domain/logic/grading.ts";
import { DEFAULT_LANGUAGE, i18n, resources, SUPPORTED_LANGUAGES, translate } from "../src/shared/i18n/config.ts";
import { translateError, translateGrade } from "../src/shared/i18n/messages.ts";

test("Spanish is the only supported locale and unsupported languages fall back to Spanish", async () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ["es"]);
  assert.equal(i18n.resolvedLanguage, "es");
  assert.equal(translate("AppLayout.inicio"), "Inicio");
  await i18n.changeLanguage("en");
  assert.equal(i18n.resolvedLanguage, "es");
  assert.equal(translate("AppLayout.inicio"), "Inicio");
  await i18n.changeLanguage(DEFAULT_LANGUAGE);
});
test("counted messages use Spanish singular and plural forms", () => {
  assert.equal(translate("common.exercises", { count: 0 }), "0 ejercicios");
  assert.equal(translate("common.exercises", { count: 1 }), "1 ejercicio");
  assert.equal(translate("common.exercises", { count: 2 }), "2 ejercicios");
  assert.equal(translate("common.blocks", { count: 1 }), "1 bloque");
});
test("domain error codes and grading feedback localize without changing grading", () => {
  const invalid = grade("Z", "P", ["P", "Q"]);
  assert.equal(invalid.status, "invalid");
  assert.equal(translateGrade(invalid), "El átomo «Z» no está definido. Usa P, Q.");
  const correct = grade("Q & P", "P ∧ Q", ["P", "Q"]);
  assert.equal(correct.status, "correct");
  assert.equal(translateGrade(correct), resources.es.translation.errors.correctFormula);
  assert.equal(translateError(new DomainError("diagnostic", "missingExamExercise", { value1: "removed" })), "No se puede calificar el ejercicio desconocido: removed");
  assert.equal(translateError(new SyntaxError("Unexpected token")), "El archivo no contiene un JSON válido.");
});
test("translations preserve formula aliases and resolve every bundled message key", () => {
  assert.match(translate("FormulaEditor.tambienPuedesEscribirNbspAmpNbspNbsp"), /<->/);
  assert.ok(!translate("FormulaEditor.tambienPuedesEscribirNbspAmpNbspNbsp").includes("&amp;"));
  function visit(value: unknown, prefix = "") {
    if (typeof value === "string") {
      assert.ok(i18n.exists(prefix), `Missing message: ${prefix}`);
      assert.ok(value.trim(), `Empty message: ${prefix}`);
      return;
    }
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) visit(item, prefix ? `${prefix}.${key}` : key);
  }
  visit(resources.es.translation);
});

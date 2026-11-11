import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { i18n } from "../src/shared/i18n/config.ts";
import { translateMessage } from "../src/shared/i18n/messages.ts";

const files = ["rewrite-laws", "clause-simplify", "resolution-tree", "guided"].map((f) => `../src/domain/logic/${f}.ts`).concat("../src/domain/exercises/types/guided-resolution.ts");
test("every namespaced code of the guided flow has a Spanish message without leftover placeholders", () => {
  const codes = new Set(files.flatMap((f) => [...readFileSync(new URL(f, import.meta.url), "utf8").matchAll(/"((?:rewrite|simplify|tree|guided)\.[A-Za-z]+)"/g)].map((m) => m[1])));
  assert.ok(codes.size > 25);
  for (const c of codes) assert.ok(i18n.exists(`errors.${c}`), `missing errors.${c}`);
});
test("messages resolve nested labels and parameters", () => {
  assert.match(translateMessage("simplify.notApplicable" as never, { kind: "pure" }), /literal puro/i);
  assert.match(translateMessage("tree.literalNotInClause" as never, { which: "side", value: "A" }), /lateral/);
  assert.match(translateMessage("rewrite.notNormalForm" as never, { form: "FNC", reason: "implication" }), /condicionales/);
});

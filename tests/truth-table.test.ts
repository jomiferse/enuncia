import assert from "node:assert/strict";
import { test } from "node:test";
import { DomainError } from "../src/domain/errors.ts";
import { exerciseTypes } from "../src/domain/exercises/registry.ts";
import {
  truthTableOptions,
  truthTableSolution,
} from "../src/domain/exercises/types/truth-table.ts";
import { validateCatalog } from "../src/domain/exercises/validation.ts";
import { parseFormula } from "../src/domain/logic/parser.ts";
import {
  checkEquivalence,
  checkValidity,
  classify,
  columnValues,
  truthRows,
} from "../src/domain/logic/truth-table.ts";
import type { Block, Exercise } from "../src/domain/models.ts";
import blocksData from "../src/data/content/blocks.json" with { type: "json" };
import contentData from "../src/data/content/enunciados-tablas-verdad.json" with { type: "json" };

const blocks = blocksData as Block[];
const content = contentData as unknown as Exercise[];
const f = (s: string, atoms: string[]) => parseFormula(s, atoms);

test("truthRows lists rows from all true to all false and limits atoms", () => {
  const rows = truthRows(["P", "Q"]);
  assert.deepEqual(rows, [
    { P: true, Q: true },
    { P: true, Q: false },
    { P: false, Q: true },
    { P: false, Q: false },
  ]);
  assert.equal(truthRows(["A", "B", "C", "D"]).length, 16);
  assert.throws(() => truthRows(["A", "B", "C", "D", "E"]), (e) => (e as DomainError).code === "truthTable.tooManyAtoms");
});
test("classification, equivalence and validity are computed by evaluation", () => {
  const a = ["P", "Q"];
  const rows = truthRows(a);
  assert.equal(classify(columnValues(f("P ∨ ¬P", a), rows)), "tautologia");
  assert.equal(classify(columnValues(f("P ∧ ¬P", a), rows)), "contradiccion");
  assert.equal(classify(columnValues(f("P → Q", a), rows)), "contingencia");
  assert.equal(checkEquivalence(f("P → Q", a), f("¬P ∨ Q", a), rows).equivalent, true);
  const ne = checkEquivalence(f("P → Q", a), f("Q → P", a), rows);
  assert.equal(ne.equivalent, false);
  assert.deepEqual(ne.equivalent === false && ne.counterexample.row, { P: true, Q: false });
  assert.equal(checkValidity([f("P → Q", a), f("P", a)], f("Q", a), rows).valid, true);
  const bad = checkValidity([f("P → Q", a), f("Q", a)], f("P", a), rows);
  assert.deepEqual(!bad.valid && bad.counterexample, { P: false, Q: true });
});

const base: Exercise = {
  id: "t-001", blockId: "b", type: "truth-table", difficulty: "basica", title: "T", tags: [],
  statement: "S", hints: ["a", "b"], explanation: "E", data: { kind: "complete", atoms: ["P"], formula: "P" },
};
const block: Block = { id: "b", areaId: "a", title: "t", subtitle: "s", type: "truth-table", description: "d" };
const codeOf = (data: Record<string, unknown> | undefined) => {
  try { validateCatalog([block], [{ ...base, data }]); } catch (e) { return (e as DomainError).code; }
};
test("invalid authored data is rejected by the catalog", () => {
  assert.equal(codeOf(base.data), undefined);
  assert.equal(codeOf(undefined), "truthTable.invalidData");
  assert.equal(codeOf({ kind: "other", atoms: ["P"], formula: "P" }), "truthTable.invalidData");
  assert.equal(codeOf({ kind: "complete", atoms: ["P"], formula: "Z" }), "truthTable.invalidData");
  assert.equal(codeOf({ kind: "complete", atoms: ["A", "B", "C", "D", "E"], formula: "A" }), "truthTable.tooManyAtoms");
  assert.equal(codeOf({ kind: "equivalence", atoms: ["P"], formulas: ["P"] }), "truthTable.invalidData");
  assert.equal(codeOf({ kind: "validity", atoms: ["P"], premises: [], conclusion: "P" }), "truthTable.invalidData");
});

const grade = (data: Record<string, unknown>, answer: string) =>
  exerciseTypes["truth-table"].grade(answer, { ...base, data });
test("complete tables: incomplete answers are invalid and wrong rows are listed", () => {
  const data = { kind: "complete", atoms: ["P", "Q"], formula: "P ∧ Q" };
  assert.equal(grade(data, "VFFF").status, "correct");
  const partial = grade(data, "VF");
  assert.equal(partial.status, "invalid");
  assert.equal(partial.messageCode, "truthTable.incomplete");
  assert.equal(grade(data, "V-F-").messageParams?.value1, 2);
  assert.equal(grade(data, "").status, "invalid");
  assert.equal(grade(data, "VXFF").status, "invalid");
  const wrong = grade(data, "VVFF");
  assert.equal(wrong.status, "incorrect");
  assert.equal(wrong.details?.length, 1);
  assert.match(wrong.details?.[0] ?? "", /Fila 2/);
});
test("option variants refute wrong answers with an interpretation", () => {
  const cls = { kind: "classify", atoms: ["P"], formula: "P ∨ ¬P" };
  assert.equal(grade(cls, "tautologia").status, "correct");
  assert.equal(grade(cls, "contingencia").status, "incorrect");
  assert.equal(grade(cls, "").status, "invalid");
  assert.equal(grade(cls, "valido").status, "invalid");
  const val = { kind: "validity", atoms: ["P", "Q"], premises: ["P → Q", "Q"], conclusion: "P" };
  const r = grade(val, "valido");
  assert.equal(r.status, "incorrect");
  assert.match(r.details?.[0] ?? "", /P = F, Q = V/);
});

test("every exercise of the block is valid, solvable and rejects a wrong answer", () => {
  assert.ok(content.length >= 20);
  validateCatalog(blocks, content);
  const bd = new Set(content.map((e) => e.difficulty));
  assert.deepEqual([...bd].sort(), ["avanzada", "basica", "media"]);
  const kinds = new Set(content.map((e) => e.data?.kind));
  assert.equal(kinds.size, 4);
  for (const e of content) {
    assert.match(e.id, /^enu-tab-\d{3}$/);
    assert.equal(e.blockId, "enunciados-tablas-verdad");
    const { data, answer, rows } = truthTableSolution(e);
    const type = exerciseTypes[e.type];
    assert.equal(type.grade(answer, e).status, "correct", e.id);
    let wrong: string;
    if (data.kind === "complete") wrong = (answer[0] === "V" ? "F" : "V") + answer.slice(1);
    else wrong = truthTableOptions[data.kind].find((o) => o !== answer)!;
    assert.equal(type.grade(wrong, e).status, "incorrect", e.id);
    assert.equal(type.grade("", e).status, "invalid", e.id);
    assert.ok(rows.length <= 16);
  }
});

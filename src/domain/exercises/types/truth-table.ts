import { DomainError } from "../../errors";
import type { Grade } from "../../logic/grading";
import { parseFormula } from "../../logic/parser";
import {
  checkEquivalence,
  checkValidity,
  classify,
  columnValues,
  MAX_TABLE_ATOMS,
  truthRows,
  type Row,
} from "../../logic/truth-table";
import type { Node } from "../../logic/types";
import { FormulaError } from "../../logic/types";
import type { Exercise } from "../../models";
import type { ExerciseTypeDefinition } from ".";

export type TruthTableKind = "complete" | "classify" | "equivalence" | "validity";
export const truthTableKinds: TruthTableKind[] = ["complete", "classify", "equivalence", "validity"];
export const truthTableOptions = {
  classify: ["tautologia", "contradiccion", "contingencia"],
  equivalence: ["equivalentes", "no-equivalentes"],
  validity: ["valido", "invalido"],
} as const;

export type TruthTableColumn = {
  role: "formula" | "premise" | "conclusion";
  /** Source text as authored. */
  source: string;
  node: Node;
};
export type TruthTableData = { kind: TruthTableKind; atoms: string[]; columns: TruthTableColumn[] };
export type TruthTableSolution = {
  data: TruthTableData;
  rows: Row[];
  /** One list of values per column, aligned with `data.columns`. */
  values: boolean[][];
  /** The correct serialized answer: V/F per row, or the correct option. */
  answer: string;
  /** Index of the row that refutes validity or equivalence, when there is one. */
  refutingRow?: number;
};

const invalidData = (e: Exercise) =>
  new DomainError(`Datos de tabla de verdad no válidos: ${e.id}`, "truthTable.invalidData", { value1: e.id });

/** Parses and validates the authored `data`; throws DomainError when it is malformed. */
export function parseTruthTableData(e: Exercise): TruthTableData {
  const d = e.data;
  if (!d || typeof d !== "object") throw invalidData(e);
  const kind = d.kind as TruthTableKind;
  if (!truthTableKinds.includes(kind)) throw invalidData(e);
  const atoms = d.atoms;
  if (
    !Array.isArray(atoms) ||
    !atoms.length ||
    atoms.some((a) => typeof a !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(a)) ||
    new Set(atoms).size !== atoms.length
  )
    throw invalidData(e);
  if (atoms.length > MAX_TABLE_ATOMS)
    throw new DomainError(`Demasiados átomos en la tabla: ${e.id}`, "truthTable.tooManyAtoms", { value1: MAX_TABLE_ATOMS });
  const names = atoms as string[];
  const column = (source: unknown, role: TruthTableColumn["role"]): TruthTableColumn => {
    if (typeof source !== "string") throw invalidData(e);
    return { role, source, node: parseFormula(source, names) };
  };
  const list = (value: unknown, min: number, max: number) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) throw invalidData(e);
    return value;
  };
  let columns: TruthTableColumn[];
  if (kind === "equivalence") columns = list(d.formulas, 2, 2).map((f) => column(f, "formula"));
  else if (kind === "validity")
    columns = [...list(d.premises, 1, 5).map((p) => column(p, "premise")), column(d.conclusion, "conclusion")];
  else columns = [column(d.formula, "formula")];
  return { kind, atoms: names, columns };
}

/** The exercise solution, always computed from its formulas. */
export function truthTableSolution(e: Exercise): TruthTableSolution {
  const data = parseTruthTableData(e);
  const rows = truthRows(data.atoms);
  const values = data.columns.map((c) => columnValues(c.node, rows));
  const base = { data, rows, values };
  if (data.kind === "complete") return { ...base, answer: values[0].map((v) => (v ? "V" : "F")).join("") };
  if (data.kind === "classify") return { ...base, answer: classify(values[0]) };
  if (data.kind === "equivalence") {
    const r = checkEquivalence(data.columns[0].node, data.columns[1].node, rows);
    return r.equivalent
      ? { ...base, answer: "equivalentes" }
      : { ...base, answer: "no-equivalentes", refutingRow: rows.indexOf(r.counterexample.row) };
  }
  const premises = data.columns.filter((c) => c.role === "premise").map((c) => c.node);
  const r = checkValidity(premises, data.columns[data.columns.length - 1].node, rows);
  return r.valid
    ? { ...base, answer: "valido" }
    : { ...base, answer: "invalido", refutingRow: rows.indexOf(r.counterexample) };
}

const vf = (v: boolean) => (v ? "V" : "F");
export const describeRow = (row: Row) =>
  Object.entries(row).map(([a, v]) => `${a} = ${vf(v)}`).join(", ");

function gradeCells(answer: string, s: TruthTableSolution): Grade {
  const text = answer.replace(/\s/g, "");
  if (!/^[VF-]*$/.test(text))
    return { status: "invalid", message: "Usa solo V, F o - en cada celda.", messageCode: "truthTable.invalidAnswer" };
  const expected = s.answer;
  const missing = [...expected].filter((_, i) => (text[i] ?? "-") === "-").length;
  if (missing > 0)
    return {
      status: "invalid",
      message: `Faltan ${missing} celdas por rellenar.`,
      messageCode: "truthTable.incomplete",
      messageParams: { value1: missing },
    };
  const wrong = [...expected].flatMap((exp, i) => (text[i] === exp ? [] : [i]));
  if (!wrong.length)
    return { status: "correct", message: "¡Correcto! La tabla está bien completada.", messageCode: "truthTable.correct" };
  return {
    status: "incorrect",
    message: `Hay ${wrong.length} filas con un valor erróneo.`,
    messageCode: "truthTable.incorrectCells",
    messageParams: { value1: wrong.length },
    details: wrong.map((i) => `Fila ${i + 1} (${describeRow(s.rows[i])}): el resultado correcto es ${expected[i]}.`),
  };
}

function refutation(answer: string, s: TruthTableSolution): string {
  const { data, rows, values } = s;
  const at = (i: number) => describeRow(rows[i]);
  if (data.kind === "classify") {
    if (answer === "tautologia") {
      const i = values[0].indexOf(false);
      return `Con ${at(i)} la fórmula vale F, así que no es una tautología.`;
    }
    if (answer === "contradiccion") {
      const i = values[0].indexOf(true);
      return `Con ${at(i)} la fórmula vale V, así que no es una contradicción.`;
    }
    return s.answer === "tautologia"
      ? "La fórmula vale V en todas las filas, así que es una tautología."
      : "La fórmula vale F en todas las filas, así que es una contradicción.";
  }
  if (data.kind === "equivalence") {
    if (s.refutingRow !== undefined) {
      const i = s.refutingRow;
      return `Con ${at(i)} la primera fórmula vale ${vf(values[0][i])} y la segunda ${vf(values[1][i])}.`;
    }
    return `Las dos fórmulas coinciden en las ${rows.length} filas.`;
  }
  if (s.refutingRow !== undefined)
    return `Con ${at(s.refutingRow)} todas las premisas son verdaderas y la conclusión es falsa.`;
  return "Ninguna fila hace verdaderas todas las premisas y falsa la conclusión.";
}

function gradeOption(answer: string, s: TruthTableSolution): Grade {
  const options: readonly string[] = truthTableOptions[s.data.kind as keyof typeof truthTableOptions];
  const choice = answer.trim();
  if (!options.includes(choice))
    return { status: "invalid", message: "Elige una opción para continuar.", messageCode: "truthTable.noOption" };
  if (choice === s.answer)
    return { status: "correct", message: "¡Correcto! Tu respuesta coincide con la tabla de verdad.", messageCode: "truthTable.correctOption" };
  return {
    status: "incorrect",
    message: "La opción elegida no coincide con la tabla de verdad.",
    messageCode: "truthTable.incorrectOption",
    details: [refutation(choice, s)],
  };
}

export const truthTable: ExerciseTypeDefinition = {
  label: "Tablas de verdad",
  validate: (e) => {
    try {
      parseTruthTableData(e);
    } catch (err) {
      if (err instanceof FormulaError)
        throw new DomainError(`Fórmula no válida en ${e.id}: ${err.message}`, "truthTable.invalidData", { value1: e.id });
      throw err;
    }
  },
  grade(answer, e) {
    const s = truthTableSolution(e);
    return s.data.kind === "complete" ? gradeCells(answer, s) : gradeOption(answer, s);
  },
};

import { DomainError } from "../errors";
import { evaluate } from "./evaluation";
import type { Node } from "./types";

/** Complete truth tables are limited to 2^4 = 16 rows. */
export const MAX_TABLE_ATOMS = 4;

export type Row = Record<string, boolean>;
export type Classification = "tautologia" | "contradiccion" | "contingencia";

/** Rows in the usual order: first row all true, last all false, first atom varies slowest. */
export function truthRows(atoms: string[]): Row[] {
  if (atoms.length > MAX_TABLE_ATOMS)
    throw new DomainError("Las tablas completas admiten hasta cuatro átomos.", "truthTable.tooManyAtoms", { value1: MAX_TABLE_ATOMS });
  const count = 2 ** atoms.length;
  return Array.from({ length: count }, (_, i) =>
    Object.fromEntries(atoms.map((a, k) => [a, !((i >> (atoms.length - 1 - k)) & 1)])),
  );
}

export const columnValues = (node: Node, rows: Row[]): boolean[] => rows.map((r) => evaluate(node, r));

export function classify(values: boolean[]): Classification {
  if (values.every(Boolean)) return "tautologia";
  if (values.every((v) => !v)) return "contradiccion";
  return "contingencia";
}

/** Equivalent when both formulas agree on every row; otherwise the first row where they differ. */
export function checkEquivalence(a: Node, b: Node, rows: Row[]) {
  const row = rows.find((r) => evaluate(a, r) !== evaluate(b, r));
  return row
    ? { equivalent: false as const, counterexample: { row, left: evaluate(a, row), right: evaluate(b, row) } }
    : { equivalent: true as const };
}

/** Valid when no row makes all premises true and the conclusion false. */
export function checkValidity(premises: Node[], conclusion: Node, rows: Row[]) {
  const row = rows.find((r) => premises.every((p) => evaluate(p, r)) && !evaluate(conclusion, r));
  return row ? { valid: false as const, counterexample: row } : { valid: true as const };
}

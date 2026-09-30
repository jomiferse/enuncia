import type { MessageCode, MessageParams } from "../errors";
import { evaluate, formatFormula } from "./evaluation";
import { MAX_ATOMS } from "./limits";
import { parseFormula } from "./parser";
import { FormulaError, type Node } from "./types";
export type Grade = {
  status: "correct" | "incorrect" | "invalid";
  message: string;
  messageCode: MessageCode;
  messageParams?: MessageParams;
  interpreted?: string;
  counterexample?: Record<string, boolean>;
  actual?: boolean;
  expected?: boolean;
};
export function grade(
  answer: string,
  solution: string,
  atoms: string[],
): Grade {
  if (atoms.length > MAX_ATOMS)
    throw new FormulaError("El corrector admite hasta ocho átomos por ejercicio.", "tooManyAtoms");
  // Validate authored solutions separately: a broken exercise must never be blamed on the student.
  const target = parseFormula(solution, atoms);
  let submitted: Node;
  try {
    submitted = parseFormula(answer, atoms);
  } catch (e) {
    if (e instanceof FormulaError)
      return { status: "invalid", message: e.message, messageCode: e.code, messageParams: e.params };
    throw e;
  }
  for (let bits = 0;bits < 2 ** atoms.length;bits++) {
    const values = Object.fromEntries(
      atoms.map((a, i) => [a, Boolean(bits & (1 << i))]),
    );
    const actual = evaluate(submitted, values),
      expected = evaluate(target, values);
    if (actual !== expected)
      return {
        status: "incorrect",
        messageCode: "incorrectFormula",
        message: "La fórmula no expresa lo mismo que el enunciado.",
        interpreted: formatFormula(submitted),
        counterexample: values,
        actual,
        expected,
      };
  }
  return {
    status: "correct",
    messageCode: "correctFormula",
    message: "¡Correcto! Tu fórmula es lógicamente equivalente a la solución.",
    interpreted: formatFormula(submitted),
  };
}

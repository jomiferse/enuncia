export type Node =
  | { kind: "atom"; name: string }
  | { kind: "not"; value: Node }
  | { kind: "and" | "or" | "implies" | "iff"; left: Node; right: Node };
export class FormulaError extends Error {}
const aliases: Record<string, string> = {
  "<->": "↔",
  "->": "→",
  "~": "¬",
  "!": "¬",
  "&": "∧",
  "|": "∨",
};
export function parseFormula(input: string, allowed: string[]): Node {
  if (!input.trim())
    throw new FormulaError("Escribe una fórmula para continuar.");
  if (input.length > 1000)
    throw new FormulaError("La fórmula es demasiado larga.");
  const tokens: string[] = [];
  let pos = 0;
  while (pos < input.length) {
    if (/\s/.test(input[pos])) {
      pos++;
      continue;
    }
    const match = /^(<->|->|[¬∧∨→↔~!&|()]|[A-Za-z][A-Za-z0-9_]*)/.exec(
      input.slice(pos),
    );
    if (!match)
      throw new FormulaError(
        `Símbolo no reconocido en la posición ${pos + 1}: «${input[pos]}».`,
      );
    tokens.push(aliases[match[0]] ?? match[0]);
    pos += match[0].length;
  }
  if (tokens.length > 300)
    throw new FormulaError("La fórmula tiene demasiados elementos.");
  let index = 0;
  let depth = 0;
  const peek = () => tokens[index];
  function unary(): Node {
    if (++depth > 64)
      throw new FormulaError("Hay demasiados niveles de anidación.");
    let result: Node;
    if (peek() === "¬") {
      index++;
      result = { kind: "not", value: unary() };
    } else if (peek() === "(") {
      index++;
      result = relation();
      if (peek() !== ")")
        throw new FormulaError("Falta un paréntesis de cierre.");
      index++;
    } else {
      const name = tokens[index++];
      if (!name || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name))
        throw new FormulaError(
          "Se esperaba un átomo, una negación o un paréntesis de apertura.",
        );
      if (!allowed.includes(name))
        throw new FormulaError(
          `El átomo «${name}» no está definido. Usa ${allowed.join(", ")}.`,
        );
      result = { kind: "atom", name };
    }
    depth--;
    return result;
  }
  function and(): Node {
    let n = unary();
    while (peek() === "∧") {
      index++;
      n = { kind: "and", left: n, right: unary() };
    }
    return n;
  }
  function or(): Node {
    let n = and();
    while (peek() === "∨") {
      index++;
      n = { kind: "or", left: n, right: and() };
    }
    return n;
  }
  function relation(): Node {
    let n = or();
    if (peek() === "→" || peek() === "↔") {
      const op = tokens[index++];
      n = { kind: op === "→" ? "implies" : "iff", left: n, right: or() };
      if (peek() === "→" || peek() === "↔")
        throw new FormulaError(
          "Agrupa los condicionales y bicondicionales con paréntesis para aclarar su alcance.",
        );
    }
    return n;
  }
  const root = relation();
  if (index !== tokens.length)
    throw new FormulaError(
      `Elemento inesperado: «${peek()}». Revisa los paréntesis y las conectivas.`,
    );
  return root;
}
export function evaluate(n: Node, values: Record<string, boolean>): boolean {
  switch (n.kind) {
    case "atom":
      return values[n.name];
    case "not":
      return !evaluate(n.value, values);
    case "and":
      return evaluate(n.left, values) && evaluate(n.right, values);
    case "or":
      return evaluate(n.left, values) || evaluate(n.right, values);
    case "implies":
      return !evaluate(n.left, values) || evaluate(n.right, values);
    case "iff":
      return evaluate(n.left, values) === evaluate(n.right, values);
  }
}
export function formatFormula(n: Node): string {
  if (n.kind === "atom") return n.name;
  if (n.kind === "not") return `¬${formatFormula(n.value)}`;
  const symbols = { and: "∧", or: "∨", implies: "→", iff: "↔" };
  return `(${formatFormula(n.left)} ${symbols[n.kind]} ${formatFormula(n.right)})`;
}
export type Grade = {
  status: "correct" | "incorrect" | "invalid";
  message: string;
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
  if (atoms.length > 8)
    throw new FormulaError(
      "El corrector admite hasta ocho átomos por ejercicio.",
    );
  // Validate authored solutions separately: a broken exercise must never be blamed on the student.
  const target = parseFormula(solution, atoms);
  let submitted: Node;
  try {
    submitted = parseFormula(answer, atoms);
  } catch (e) {
    if (e instanceof FormulaError)
      return { status: "invalid", message: e.message };
    throw e;
  }
  for (let bits = 0; bits < 2 ** atoms.length; bits++) {
    const values = Object.fromEntries(
      atoms.map((a, i) => [a, Boolean(bits & (1 << i))]),
    );
    const actual = evaluate(submitted, values),
      expected = evaluate(target, values);
    if (actual !== expected)
      return {
        status: "incorrect",
        message: "La fórmula no expresa lo mismo que el enunciado.",
        interpreted: formatFormula(submitted),
        counterexample: values,
        actual,
        expected,
      };
  }
  return {
    status: "correct",
    message: "¡Correcto! Tu fórmula es lógicamente equivalente a la solución.",
    interpreted: formatFormula(submitted),
  };
}

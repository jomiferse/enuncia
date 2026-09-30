import { MAX_FORMULA_DEPTH, MAX_FORMULA_LENGTH, MAX_FORMULA_TOKENS } from "./limits";
import { FormulaError, type Node } from "./types";
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
    throw new FormulaError("Escribe una fórmula para continuar.", "formulaRequired");
  if (input.length > MAX_FORMULA_LENGTH)
    throw new FormulaError("La fórmula es demasiado larga.", "formulaTooLong");
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
      throw new FormulaError(`Símbolo no reconocido en la posición ${pos + 1}: «${input[pos]}».`, "unrecognizedSymbol", { value1: pos + 1, value2: input[pos] });
    tokens.push(aliases[match[0]] ?? match[0]);
    pos += match[0].length;
  }
  if (tokens.length > MAX_FORMULA_TOKENS)
    throw new FormulaError("La fórmula tiene demasiados elementos.", "tooManyTokens");
  let index = 0;
  let depth = 0;
  const peek = () => tokens[index];
  function unary(): Node {
    if (++depth > MAX_FORMULA_DEPTH)
      throw new FormulaError("Hay demasiados niveles de anidación.", "tooDeep");
    let result: Node;
    if (peek() === "¬") {
      index++;
      result = { kind: "not", value: unary() };
    } else if (peek() === "(") {
      index++;
      result = relation();
      if (peek() !== ")")
        throw new FormulaError("Falta un paréntesis de cierre.", "missingClosingParenthesis");
      index++;
    } else {
      const name = tokens[index++];
      if (!name || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name))
        throw new FormulaError("Se esperaba un átomo, una negación o un paréntesis de apertura.", "expectedAtom");
      if (!allowed.includes(name))
        throw new FormulaError(`El átomo «${name}» no está definido. Usa ${allowed.join(", ")}.`, "unknownAtom", { value1: name, value2: allowed.join(", ") });
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
        throw new FormulaError("Agrupa los condicionales y bicondicionales con paréntesis para aclarar su alcance.", "ambiguousRelations");
    }
    return n;
  }
  const root = relation();
  if (index !== tokens.length)
    throw new FormulaError(`Elemento inesperado: «${peek()}». Revisa los paréntesis y las conectivas.`, "unexpectedElement", { value1: peek() });
  return root;
}

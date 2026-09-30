import type { Node } from "./types";
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

import { DomainError } from "../errors";
export type Node =
  | { kind: "atom"; name: string }
  | { kind: "not"; value: Node }
  | { kind: "and" | "or" | "implies" | "iff"; left: Node; right: Node };
export class FormulaError extends DomainError { }

import { DomainError, type MessageCode, type MessageParams } from "../errors";
import { MAX_FORMULA_DEPTH, MAX_FORMULA_LENGTH, MAX_FORMULA_TOKENS } from "./limits";

/**
 * First-order (predicate) language.
 *
 * Terms are extensible: `fn` is already part of the AST (and parsed when the
 * signature declares `functions`) so Skolem functions can be added later.
 */
export type Term =
  | { kind: "var"; name: string }
  | { kind: "const"; name: string }
  | { kind: "fn"; name: string; args: Term[] };

export type PNode =
  | { kind: "pred"; name: string; args: Term[] }
  | { kind: "not"; value: PNode }
  | { kind: "and" | "or" | "implies" | "iff"; left: PNode; right: PNode }
  | { kind: "forall" | "exists"; variable: string; body: PNode };

export type PredicateSignature = {
  /** Predicate name -> arity (0 allowed: written without parentheses). */
  predicates: Record<string, number>;
  constants: string[];
  /** Variable names usable in terms and quantifiers. Defaults to `defaultVariables`. */
  variables?: string[];
  /** Function name -> arity (>= 1). Optional; used by Skolemization. */
  functions?: Record<string, number>;
};

export const defaultVariables = ["x", "y", "z", "u", "v", "w"];

export class PredicateError extends DomainError {
  constructor(message: string, code: MessageCode, params: MessageParams = {}) {
    super(message, code, params);
  }
}

const aliases: Record<string, string> = {
  "<->": "↔",
  "->": "→",
  "~": "¬",
  "!": "¬",
  "&": "∧",
  "|": "∨",
  forall: "∀",
  exists: "∃",
};
const identifier = /^[A-Za-z][A-Za-z0-9_]*$/;

export function signatureVariables(signature: PredicateSignature): string[] {
  return signature.variables ?? defaultVariables;
}

/** Throws when names are malformed, repeated across categories, or arities invalid. */
export function validateSignature(signature: PredicateSignature): void {
  const seen = new Set<string>();
  const names = [
    ...Object.keys(signature.predicates),
    ...signature.constants,
    ...signatureVariables(signature),
    ...Object.keys(signature.functions ?? {}),
  ];
  for (const name of names) {
    if (!identifier.test(name) || seen.has(name) || name === "forall" || name === "exists")
      throw new PredicateError(`Signatura no válida: «${name}».`, "predicates.invalidSignature", { value1: name });
    seen.add(name);
  }
  for (const [name, arity] of [...Object.entries(signature.predicates), ...Object.entries(signature.functions ?? {})])
    if (!Number.isInteger(arity) || arity < 0 || arity > 4 || (arity === 0 && signature.functions && name in signature.functions))
      throw new PredicateError(`Aridad no válida para «${name}».`, "predicates.invalidSignature", { value1: name });
}

export function parsePredicateFormula(input: string, signature: PredicateSignature): PNode {
  validateSignature(signature);
  if (!input.trim())
    throw new PredicateError("Escribe una fórmula para continuar.", "formulaRequired");
  if (input.length > MAX_FORMULA_LENGTH)
    throw new PredicateError("La fórmula es demasiado larga.", "formulaTooLong");
  const tokens: string[] = [];
  let pos = 0;
  while (pos < input.length) {
    if (/\s/.test(input[pos])) {
      pos++;
      continue;
    }
    const match = /^(<->|->|[¬∧∨→↔∀∃~!&|(),]|[A-Za-z][A-Za-z0-9_]*)/.exec(input.slice(pos));
    if (!match)
      throw new PredicateError(`Símbolo no reconocido en la posición ${pos + 1}: «${input[pos]}».`, "unrecognizedSymbol", { value1: pos + 1, value2: input[pos] });
    tokens.push(aliases[match[0]] ?? match[0]);
    pos += match[0].length;
  }
  if (tokens.length > MAX_FORMULA_TOKENS)
    throw new PredicateError("La fórmula tiene demasiados elementos.", "tooManyTokens");

  const variables = signatureVariables(signature);
  const functions = signature.functions ?? {};
  let index = 0;
  let depth = 0;
  const peek = () => tokens[index];
  const isName = (token: string | undefined): token is string => token !== undefined && identifier.test(token);
  const enter = () => {
    if (++depth > MAX_FORMULA_DEPTH)
      throw new PredicateError("Hay demasiados niveles de anidación.", "tooDeep");
  };
  const list = () => [...Object.keys(signature.predicates), ...signature.constants, ...variables].join(", ");

  function arguments_(name: string, expected: number, kind: "predicate" | "function"): Term[] {
    index++; // "("
    const args: Term[] = [];
    if (peek() === ")")
      throw new PredicateError("Se esperaba un término.", "predicates.expectedTerm");
    for (;;) {
      args.push(term());
      if (peek() === ",") {
        index++;
        continue;
      }
      break;
    }
    if (peek() !== ")")
      throw new PredicateError("Falta un paréntesis de cierre.", "missingClosingParenthesis");
    index++;
    if (args.length !== expected)
      throw new PredicateError(
        `«${name}» tiene aridad ${expected} pero se usa con ${args.length} argumento(s).`,
        kind === "predicate" ? "predicates.arityMismatch" : "predicates.functionArityMismatch",
        { value1: name, value2: expected, value3: args.length },
      );
    return args;
  }

  function term(): Term {
    enter();
    const name = tokens[index++];
    if (!isName(name))
      throw new PredicateError("Se esperaba un término.", "predicates.expectedTerm");
    let result: Term;
    if (name in functions) {
      if (peek() !== "(")
        throw new PredicateError(`«${name}» es una función: escribe sus argumentos entre paréntesis.`, "predicates.functionArityMismatch", { value1: name, value2: functions[name], value3: 0 });
      result = { kind: "fn", name, args: arguments_(name, functions[name], "function") };
    } else if (variables.includes(name)) result = { kind: "var", name };
    else if (signature.constants.includes(name)) result = { kind: "const", name };
    else if (name in signature.predicates)
      throw new PredicateError(`«${name}» es un predicado, no un término.`, "predicates.predicateAsTerm", { value1: name });
    else throw new PredicateError(`El símbolo «${name}» no está declarado.`, "predicates.unknownSymbol", { value1: name });
    depth--;
    return result;
  }

  function unary(): PNode {
    enter();
    let result: PNode;
    const token = peek();
    if (token === "¬") {
      index++;
      result = { kind: "not", value: unary() };
    } else if (token === "∀" || token === "∃") {
      index++;
      const variable = tokens[index++];
      if (!isName(variable))
        throw new PredicateError("Tras un cuantificador se esperaba una variable.", "predicates.expectedVariable");
      if (!variables.includes(variable))
        throw new PredicateError(`«${variable}» no es una variable declarada. Variables: ${variables.join(", ")}.`, "predicates.undeclaredVariable", { value1: variable, value2: variables.join(", ") });
      result = { kind: token === "∀" ? "forall" : "exists", variable, body: unary() };
    } else if (token === "(") {
      index++;
      result = relation();
      if (peek() !== ")")
        throw new PredicateError("Falta un paréntesis de cierre.", "missingClosingParenthesis");
      index++;
    } else {
      const name = tokens[index++];
      if (!isName(name))
        throw new PredicateError("Se esperaba un predicado, una negación, un cuantificador o un paréntesis de apertura.", "predicates.expectedFormula");
      if (!(name in signature.predicates)) {
        if (variables.includes(name) || signature.constants.includes(name) || name in functions)
          throw new PredicateError(`«${name}» no es un predicado.`, "predicates.termAsFormula", { value1: name });
        throw new PredicateError(`El predicado «${name}» no está declarado. Símbolos disponibles: ${list()}.`, "predicates.unknownPredicate", { value1: name, value2: list() });
      }
      const arity = signature.predicates[name];
      if (peek() === "(") result = { kind: "pred", name, args: arguments_(name, arity, "predicate") };
      else if (arity === 0) result = { kind: "pred", name, args: [] };
      else
        throw new PredicateError(`«${name}» tiene aridad ${arity} pero se usa con 0 argumento(s).`, "predicates.arityMismatch", { value1: name, value2: arity, value3: 0 });
    }
    depth--;
    return result;
  }
  function and(): PNode {
    let n = unary();
    while (peek() === "∧") {
      index++;
      n = { kind: "and", left: n, right: unary() };
    }
    return n;
  }
  function or(): PNode {
    let n = and();
    while (peek() === "∨") {
      index++;
      n = { kind: "or", left: n, right: and() };
    }
    return n;
  }
  function relation(): PNode {
    let n = or();
    if (peek() === "→" || peek() === "↔") {
      const op = tokens[index++];
      n = { kind: op === "→" ? "implies" : "iff", left: n, right: or() };
      if (peek() === "→" || peek() === "↔")
        throw new PredicateError("Agrupa los condicionales y bicondicionales con paréntesis para aclarar su alcance.", "ambiguousRelations");
    }
    return n;
  }
  const root = relation();
  if (index !== tokens.length)
    throw new PredicateError(`Elemento inesperado: «${peek()}». Revisa los paréntesis y las conectivas.`, "unexpectedElement", { value1: peek() });
  return root;
}

/** Checks an AST (e.g. built programmatically) against a signature. */
export function checkArities(node: PNode, signature: PredicateSignature): void {
  const variables = signatureVariables(signature);
  const functions = signature.functions ?? {};
  const checkTerm = (t: Term): void => {
    if (t.kind === "var") {
      if (!variables.includes(t.name)) throw new PredicateError(`El símbolo «${t.name}» no está declarado.`, "predicates.unknownSymbol", { value1: t.name });
    } else if (t.kind === "const") {
      if (!signature.constants.includes(t.name)) throw new PredicateError(`El símbolo «${t.name}» no está declarado.`, "predicates.unknownSymbol", { value1: t.name });
    } else {
      if (!(t.name in functions)) throw new PredicateError(`El símbolo «${t.name}» no está declarado.`, "predicates.unknownSymbol", { value1: t.name });
      if (functions[t.name] !== t.args.length)
        throw new PredicateError(`«${t.name}» tiene aridad ${functions[t.name]}.`, "predicates.functionArityMismatch", { value1: t.name, value2: functions[t.name], value3: t.args.length });
      t.args.forEach(checkTerm);
    }
  };
  const visit = (n: PNode): void => {
    switch (n.kind) {
      case "pred":
        if (!(n.name in signature.predicates))
          throw new PredicateError(`El predicado «${n.name}» no está declarado.`, "predicates.unknownPredicate", { value1: n.name, value2: Object.keys(signature.predicates).join(", ") });
        if (signature.predicates[n.name] !== n.args.length)
          throw new PredicateError(`«${n.name}» tiene aridad ${signature.predicates[n.name]}.`, "predicates.arityMismatch", { value1: n.name, value2: signature.predicates[n.name], value3: n.args.length });
        n.args.forEach(checkTerm);
        return;
      case "not":
        return visit(n.value);
      case "forall":
      case "exists":
        if (!variables.includes(n.variable))
          throw new PredicateError(`«${n.variable}» no es una variable declarada.`, "predicates.undeclaredVariable", { value1: n.variable, value2: variables.join(", ") });
        return visit(n.body);
      default:
        visit(n.left);
        visit(n.right);
    }
  };
  visit(node);
}

export function formatTerm(t: Term): string {
  return t.kind === "fn" ? `${t.name}(${t.args.map(formatTerm).join(", ")})` : t.name;
}

function formatInner(n: PNode): string {
  switch (n.kind) {
    case "pred":
      return n.args.length ? `${n.name}(${n.args.map(formatTerm).join(", ")})` : n.name;
    case "not":
      return `¬${formatInner(n.value)}`;
    case "forall":
    case "exists":
      return `${n.kind === "forall" ? "∀" : "∃"}${n.variable} ${formatInner(n.body)}`;
    default: {
      const symbols = { and: "∧", or: "∨", implies: "→", iff: "↔" };
      return `(${formatInner(n.left)} ${symbols[n.kind]} ${formatInner(n.right)})`;
    }
  }
}

/** Normalized text, e.g. `∀x (P(x) → ∃y R(x, y))`; the outermost parentheses are omitted. */
export function formatPredicateFormula(n: PNode): string {
  const text = formatInner(n);
  return n.kind === "and" || n.kind === "or" || n.kind === "implies" || n.kind === "iff" ? text.slice(1, -1) : text;
}

// ---- Variables, substitution, equality (for natural deduction and resolution) ----

export function termVariables(t: Term): Set<string> {
  if (t.kind === "var") return new Set([t.name]);
  if (t.kind === "const") return new Set();
  return new Set(t.args.flatMap((a) => [...termVariables(a)]));
}

export function freeVariables(n: PNode): Set<string> {
  switch (n.kind) {
    case "pred":
      return new Set(n.args.flatMap((a) => [...termVariables(a)]));
    case "not":
      return freeVariables(n.value);
    case "forall":
    case "exists": {
      const free = freeVariables(n.body);
      free.delete(n.variable);
      return free;
    }
    default:
      return new Set([...freeVariables(n.left), ...freeVariables(n.right)]);
  }
}

export function boundVariables(n: PNode): Set<string> {
  switch (n.kind) {
    case "pred":
      return new Set();
    case "not":
      return boundVariables(n.value);
    case "forall":
    case "exists":
      return new Set([n.variable, ...boundVariables(n.body)]);
    default:
      return new Set([...boundVariables(n.left), ...boundVariables(n.right)]);
  }
}

export const isClosed = (n: PNode): boolean => freeVariables(n).size === 0;

export function substituteTerm(t: Term, variable: string, replacement: Term): Term {
  if (t.kind === "var") return t.name === variable ? replacement : t;
  if (t.kind === "const") return t;
  return { kind: "fn", name: t.name, args: t.args.map((a) => substituteTerm(a, variable, replacement)) };
}

/** True when no free occurrence of `variable` in `n` lies under a quantifier that would capture `term`. */
export function isFreeFor(n: PNode, variable: string, term: Term): boolean {
  const vars = termVariables(term);
  const visit = (m: PNode): boolean => {
    switch (m.kind) {
      case "pred":
        return true;
      case "not":
        return visit(m.value);
      case "forall":
      case "exists":
        if (m.variable === variable) return true;
        if (!freeVariables(m.body).has(variable)) return true;
        return !vars.has(m.variable) && visit(m.body);
      default:
        return visit(m.left) && visit(m.right);
    }
  };
  return visit(n);
}

/** Replaces the free occurrences of `variable` by `term`, renaming bound variables when needed to avoid capture. */
export function substitute(n: PNode, variable: string, term: Term): PNode {
  const termVars = termVariables(term);
  const visit = (m: PNode): PNode => {
    switch (m.kind) {
      case "pred":
        return { kind: "pred", name: m.name, args: m.args.map((a) => substituteTerm(a, variable, term)) };
      case "not":
        return { kind: "not", value: visit(m.value) };
      case "forall":
      case "exists": {
        if (m.variable === variable || !freeVariables(m.body).has(variable)) return m;
        if (!termVars.has(m.variable)) return { ...m, body: visit(m.body) };
        const used = new Set([...termVars, ...freeVariables(m.body), ...boundVariables(m.body), variable]);
        let i = 1;
        while (used.has(`${m.variable}${i}`)) i++;
        const fresh = `${m.variable}${i}`;
        const renamed = substitute(m.body, m.variable, { kind: "var", name: fresh });
        return { kind: m.kind, variable: fresh, body: substitute(renamed, variable, term) };
      }
      default:
        return { kind: m.kind, left: visit(m.left), right: visit(m.right) };
    }
  };
  return visit(n);
}

export function termsEqual(a: Term, b: Term): boolean {
  if (a.kind !== b.kind || a.name !== b.name) return false;
  if (a.kind === "fn" && b.kind === "fn")
    return a.args.length === b.args.length && a.args.every((x, i) => termsEqual(x, b.args[i]));
  return true;
}

/** Structural equality (bound variable names matter). */
export function formulasEqual(a: PNode, b: PNode): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "pred": {
      const o = b as typeof a;
      return a.name === o.name && a.args.length === o.args.length && a.args.every((t, i) => termsEqual(t, o.args[i]));
    }
    case "not":
      return formulasEqual(a.value, (b as typeof a).value);
    case "forall":
    case "exists": {
      const o = b as typeof a;
      return a.variable === o.variable && formulasEqual(a.body, o.body);
    }
    default: {
      const o = b as typeof a;
      return formulasEqual(a.left, o.left) && formulasEqual(a.right, o.right);
    }
  }
}

/** Equality up to renaming of bound variables. */
export function alphaEquivalent(a: PNode, b: PNode): boolean {
  const eqTerm = (s: Term, t: Term, env: [string, string][]): boolean => {
    if (s.kind !== t.kind) return false;
    if (s.kind === "var" && t.kind === "var") {
      for (let i = env.length - 1; i >= 0; i--) {
        if (env[i][0] === s.name || env[i][1] === t.name) return env[i][0] === s.name && env[i][1] === t.name;
      }
      return s.name === t.name;
    }
    if (s.kind === "fn" && t.kind === "fn")
      return s.name === t.name && s.args.length === t.args.length && s.args.every((x, i) => eqTerm(x, t.args[i], env));
    return s.name === t.name;
  };
  const eq = (x: PNode, y: PNode, env: [string, string][]): boolean => {
    if (x.kind !== y.kind) return false;
    switch (x.kind) {
      case "pred": {
        const o = y as typeof x;
        return x.name === o.name && x.args.length === o.args.length && x.args.every((t, i) => eqTerm(t, o.args[i], env));
      }
      case "not":
        return eq(x.value, (y as typeof x).value, env);
      case "forall":
      case "exists":
        return eq(x.body, (y as typeof x).body, [...env, [x.variable, (y as typeof x).variable]]);
      default: {
        const o = y as typeof x;
        return eq(x.left, o.left, env) && eq(x.right, o.right, env);
      }
    }
  };
  return eq(a, b, []);
}

export function predicateSymbols(n: PNode): { predicates: Set<string>; constants: Set<string>; functions: Set<string> } {
  const out = { predicates: new Set<string>(), constants: new Set<string>(), functions: new Set<string>() };
  const term = (t: Term): void => {
    if (t.kind === "const") out.constants.add(t.name);
    else if (t.kind === "fn") {
      out.functions.add(t.name);
      t.args.forEach(term);
    }
  };
  const visit = (m: PNode): void => {
    if (m.kind === "pred") {
      out.predicates.add(m.name);
      m.args.forEach(term);
    } else if (m.kind === "not") visit(m.value);
    else if ("body" in m) visit(m.body);
    else {
      visit(m.left);
      visit(m.right);
    }
  };
  visit(n);
  return out;
}

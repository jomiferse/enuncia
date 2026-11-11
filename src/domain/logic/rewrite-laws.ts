/**
 * Motor de leyes de reescritura de un paso (change `guided-resolution-flow`, fase 1: FNC / FNS).
 *
 * FÓRMULAS (`RFormula`): átomos (en enunciados, predicados de aridad 0), ¬ ∧ ∨ →, ∀ ∃ (solo predicados) y las
 * constantes ■ (verdadero) y □ (falso). No hay ↔ (se rechaza). Alias de teclado: `->`, `~`, `!`, `&`, `|`,
 * `forall`, `exists`. ∧ liga más que ∨; el condicional exige paréntesis si se encadena; el cuerpo de un
 * cuantificador es una fórmula unaria (`∀x (P(x) ∨ Q)`).
 *
 * COMPARACIÓN: los pasos se comparan con `strictKey` (módulo asociatividad y conmutatividad de ∧/∨, sin eliminar
 * duplicados ni renombrar variables). `canonicalKey` además elimina duplicados triviales de ∧/∨ y es invariante
 * por renombrado de variables ligadas.
 *
 * LEYES: cada ley genera TODOS los resultados de aplicarla una vez sobre alguna subfórmula (∧/∨ se tratan como
 * n-arias, de modo que se admite cualquier agrupación asociativa/conmutativa). El paso es correcto si el resultado
 * escrito coincide con alguno.
 *   - De Morgan: se admite la forma n-aria y cualquier partición en dos grupos.
 *   - distribOrAnd: A ∨ (B ∧ C ∧ …); A = cualquier subconjunto no vacío de los otros disyuntos; (B, C) cualquier
 *     partición en dos grupos de la conjunción, o la distribución completa.
 *   - absorbOrTop / absorbAndBottom: el «A» absorbido es cualquier subconjunto no vacío de los demás operandos.
 *   - renameForall / renameExists: cualquier variable declarada que no sea libre en el cuerpo y no capture.
 *   - moveForall: saca UN ∀ de un operando de ∧/∨ hacia fuera de un grupo de operandos (renombrando la variable
 *     si choca con una libre en los demás), o la cadena completa de ∀ consecutivos de ese operando sin renombrar.
 *   - skolem: elimina un ∃ en posición positiva (no bajo ¬ ni a la izquierda de →); la función de Skolem recibe
 *     como argumentos las variables ∀ que lo rodean, de fuera adentro (constante si no hay ninguna). El símbolo
 *     puede llamarse como se quiera pero debe ser nuevo (ni en la signatura ni en la fórmula anterior).
 *
 * CÓDIGOS (`errors.<código>`; los de sintaxis reutilizan los comunes: formulaRequired, unrecognizedSymbol,
 * unknownAtom, expectedAtom, predicates.*, etc.):
 *   rewrite.lawNotAllowedForLanguage  {law}              ley no disponible en el lenguaje del ejercicio
 *   rewrite.lawNotApplicable          {law}              la ley no se puede aplicar en ninguna parte
 *   rewrite.resultMismatch            {law}              el resultado no sale de aplicar esa ley una vez
 *   rewrite.noChange                  {law}              el resultado es igual a la fórmula anterior
 *   rewrite.notNormalForm             {form, reason}     terminal prematuro (form FNC|FNS; reason: implication,
 *                                                        negation, distribution, constants, quantifiers, existential)
 *   rewrite.skolemSymbolNotFresh      {symbol}           el símbolo de Skolem ya existe
 *   rewrite.skolemArguments           {symbol, expected} argumentos de Skolem incorrectos (nº esperado)
 *   rewrite.unsupportedConnective     {value}            ↔ no está soportado (error de parseo)
 *   rewrite.previousInvalid                              la fórmula anterior no se puede interpretar
 *   predicates.unknownSymbol          {value1}           símbolo nuevo fuera de la skolemización
 * `law` es siempre la etiqueta en español (`lawLabel`). Los mensajes no revelan el resultado correcto.
 */
import { DomainError, type MessageCode, type MessageParams } from "../errors";
import { type ClauseSet, formatClause, normalizeClause } from "./clauses";
import type { FormulaContext, LawId, NormalFormStep } from "./guided-types";
import { MAX_FORMULA_DEPTH, MAX_FORMULA_LENGTH, MAX_FORMULA_TOKENS } from "./limits";
import { type PClause, formatPClause, normalizePClause } from "./predicate-clauses";
import { PredicateError, type Term, formatTerm, signatureVariables } from "./predicates";
import { FormulaError } from "./types";

export type RFormula =
  | { kind: "top" }
  | { kind: "bottom" }
  | { kind: "pred"; name: string; args: Term[] }
  | { kind: "not"; value: RFormula }
  | { kind: "and" | "or" | "implies"; left: RFormula; right: RFormula }
  | { kind: "forall" | "exists"; variable: string; body: RFormula };

export type SkolemSymbol = { name: string; arity: number };

export type NormalFormCheck =
  | { ok: true; result: string; skolemSymbols?: SkolemSymbol[] }
  | { ok: false; code: MessageCode; params?: MessageParams };

// ---------------------------------------------------------------- construcción y utilidades

const TOP: RFormula = { kind: "top" };
const BOTTOM: RFormula = { kind: "bottom" };
const not = (value: RFormula): RFormula => ({ kind: "not", value });
const SK = "§";

function flatten(f: RFormula, kind: "and" | "or"): RFormula[] {
  return f.kind === kind ? [...flatten(f.left, kind), ...flatten(f.right, kind)] : [f];
}

function build(kind: "and" | "or", parts: RFormula[]): RFormula {
  return parts.slice(1).reduce<RFormula>((left, right) => ({ kind, left, right }), parts[0]);
}

function termVars(t: Term, out: Set<string>): Set<string> {
  if (t.kind === "var") out.add(t.name);
  else if (t.kind === "fn") t.args.forEach(a => termVars(a, out));
  return out;
}

function freeVars(f: RFormula): Set<string> {
  switch (f.kind) {
    case "top":
    case "bottom":
      return new Set();
    case "pred":
      return f.args.reduce((s, a) => termVars(a, s), new Set<string>());
    case "not":
      return freeVars(f.value);
    case "forall":
    case "exists": {
      const s = freeVars(f.body);
      s.delete(f.variable);
      return s;
    }
    default:
      return new Set([...freeVars(f.left), ...freeVars(f.right)]);
  }
}

function substTerm(t: Term, from: string, to: Term): Term {
  if (t.kind === "var") return t.name === from ? to : t;
  if (t.kind === "const") return t;
  return { kind: "fn", name: t.name, args: t.args.map(a => substTerm(a, from, to)) };
}

/** Sustituye las apariciones libres de `from`; null si alguna variable de `to` quedaría capturada. */
function substVar(f: RFormula, from: string, to: Term): RFormula | null {
  const toVars = termVars(to, new Set());
  const visit = (g: RFormula): RFormula | null => {
    switch (g.kind) {
      case "top":
      case "bottom":
        return g;
      case "pred":
        return { kind: "pred", name: g.name, args: g.args.map(a => substTerm(a, from, to)) };
      case "not": {
        const v = visit(g.value);
        return v && not(v);
      }
      case "forall":
      case "exists": {
        if (g.variable === from || !freeVars(g.body).has(from)) return g;
        if (toVars.has(g.variable)) return null;
        const body = visit(g.body);
        return body && { kind: g.kind, variable: g.variable, body };
      }
      default: {
        const left = visit(g.left);
        const right = left && visit(g.right);
        return left && right && { kind: g.kind, left, right };
      }
    }
  };
  return visit(f);
}

type Symbols = { names: Set<string>; arities: Map<string, number> };
/** Constantes y funciones (con aridad) que aparecen en la fórmula. */
function termSymbols(f: RFormula): Symbols {
  const out: Symbols = { names: new Set(), arities: new Map() };
  const term = (t: Term): void => {
    if (t.kind === "var") return;
    out.names.add(t.name);
    out.arities.set(t.name, t.kind === "fn" ? t.args.length : 0);
    if (t.kind === "fn") t.args.forEach(term);
  };
  const visit = (g: RFormula): void => {
    switch (g.kind) {
      case "pred":
        g.args.forEach(term);
        return;
      case "not":
        return visit(g.value);
      case "forall":
      case "exists":
        return visit(g.body);
      case "and":
      case "or":
      case "implies":
        visit(g.left);
        visit(g.right);
    }
  };
  visit(f);
  return out;
}

/** Sustituye todo término (constante o función) llamado `name` por la variable ficticia «§». */
function hideSymbol(f: RFormula, name: string): RFormula {
  const term = (t: Term): Term =>
    t.kind === "var" ? t : t.name === name ? { kind: "var", name: SK } : t.kind === "const" ? t : { kind: "fn", name: t.name, args: t.args.map(term) };
  const visit = (g: RFormula): RFormula => {
    switch (g.kind) {
      case "top":
      case "bottom":
        return g;
      case "pred":
        return { kind: "pred", name: g.name, args: g.args.map(term) };
      case "not":
        return not(visit(g.value));
      case "forall":
      case "exists":
        return { kind: g.kind, variable: g.variable, body: visit(g.body) };
      default:
        return { kind: g.kind, left: visit(g.left), right: visit(g.right) };
    }
  };
  return visit(f);
}

/** Cambia el nombre del símbolo ficticio de Skolem («§») por `name`. */
function renameSymbol(f: RFormula, from: string, to: string): RFormula {
  const term = (t: Term): Term =>
    t.kind === "var" ? t : t.kind === "const" ? (t.name === from ? { kind: "const", name: to } : t) : { kind: "fn", name: t.name === from ? to : t.name, args: t.args.map(term) };
  const visit = (g: RFormula): RFormula => {
    switch (g.kind) {
      case "top":
      case "bottom":
        return g;
      case "pred":
        return { kind: "pred", name: g.name, args: g.args.map(term) };
      case "not":
        return not(visit(g.value));
      case "forall":
      case "exists":
        return { kind: g.kind, variable: g.variable, body: visit(g.body) };
      default:
        return { kind: g.kind, left: visit(g.left), right: visit(g.right) };
    }
  };
  return visit(f);
}

const hasSkolemPlaceholder = (f: RFormula) => termSymbols(f).names.has(SK);

// ---------------------------------------------------------------- claves

function termKey(t: Term, env: string[], alpha: boolean): string {
  if (t.kind === "var") {
    if (alpha) {
      const i = env.lastIndexOf(t.name);
      if (i >= 0) return `#${env.length - 1 - i}`;
    }
    return `?${t.name}`;
  }
  if (t.kind === "const") return `$${t.name}`;
  return `${t.name}(${t.args.map(a => termKey(a, env, alpha)).join(",")})`;
}

function keyOf(f: RFormula, dedupe: boolean, alpha: boolean, env: string[]): string {
  switch (f.kind) {
    case "top":
      return "T";
    case "bottom":
      return "F";
    case "pred":
      return `${f.name}(${f.args.map(a => termKey(a, env, alpha)).join(",")})`;
    case "not":
      return `!(${keyOf(f.value, dedupe, alpha, env)})`;
    case "and":
    case "or": {
      let keys = flatten(f, f.kind).map(c => keyOf(c, dedupe, alpha, env)).sort();
      if (dedupe) keys = [...new Set(keys)];
      return keys.length === 1 ? keys[0] : `${f.kind === "and" ? "&" : "|"}[${keys.join(";")}]`;
    }
    case "implies":
      return `>(${keyOf(f.left, dedupe, alpha, env)};${keyOf(f.right, dedupe, alpha, env)})`;
    default:
      return `${f.kind === "forall" ? "A" : "E"}${alpha ? "" : f.variable}(${keyOf(f.body, dedupe, alpha, alpha ? [...env, f.variable] : env)})`;
  }
}

/** Clave módulo asociatividad y conmutatividad de ∧/∨; conserva duplicados y nombres de variables. */
export const strictKey = (f: RFormula): string => keyOf(f, false, false, []);

/** Clave estable módulo asociatividad, conmutatividad, duplicados triviales de ∧/∨ y renombrado de ligadas. */
export const canonicalKey = (f: RFormula): string => keyOf(f, true, true, []);

// ---------------------------------------------------------------- formato

function formatOperand(f: RFormula): string {
  const text = formatRewriteFormula(f);
  return f.kind === "and" || f.kind === "or" || f.kind === "implies" || f.kind === "forall" || f.kind === "exists" ? `(${text})` : text;
}

/** Texto canónico: sin paréntesis redundantes de ∧/∨ asociativos, sin paréntesis exteriores. */
export function formatRewriteFormula(f: RFormula): string {
  switch (f.kind) {
    case "top":
      return "■";
    case "bottom":
      return "□";
    case "pred":
      return f.args.length ? `${f.name}(${f.args.map(formatTerm).join(", ")})` : f.name;
    case "not":
      return `¬${f.value.kind === "and" || f.value.kind === "or" || f.value.kind === "implies" ? `(${formatRewriteFormula(f.value)})` : formatRewriteFormula(f.value)}`;
    case "and":
    case "or":
      return flatten(f, f.kind)
        .map(c => (c.kind === (f.kind === "and" ? "or" : "and") || c.kind === "implies" || c.kind === "forall" || c.kind === "exists" ? `(${formatRewriteFormula(c)})` : formatRewriteFormula(c)))
        .join(f.kind === "and" ? " ∧ " : " ∨ ");
    case "implies":
      return `${formatOperand(f.left)} → ${formatOperand(f.right)}`;
    default: {
      const b = f.body;
      const body = b.kind === "and" || b.kind === "or" || b.kind === "implies" ? `(${formatRewriteFormula(b)})` : formatRewriteFormula(b);
      return `${f.kind === "forall" ? "∀" : "∃"}${f.variable} ${body}`;
    }
  }
}

// ---------------------------------------------------------------- parseo

const aliases: Record<string, string> = { "->": "→", "~": "¬", "!": "¬", "&": "∧", "|": "∨", forall: "∀", exists: "∃" };
const identifier = /^[A-Za-z][A-Za-z0-9_]*$/;

export function parseRewriteFormula(ctx: FormulaContext, text: string, options: { allowSkolem?: boolean } = {}): RFormula {
  const predicate = ctx.language === "predicate";
  const fail = (message: string, code: MessageCode, params: MessageParams = {}): never => {
    throw predicate ? new PredicateError(message, code, params) : new FormulaError(message, code, params);
  };
  if (!text.trim()) return fail("Escribe una fórmula para continuar.", "formulaRequired");
  if (text.length > MAX_FORMULA_LENGTH) return fail("La fórmula es demasiado larga.", "formulaTooLong");
  const tokens: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    if (/\s/.test(text[pos])) {
      pos++;
      continue;
    }
    const match = /^(<->|->|[¬∧∨→↔∀∃~!&|(),■□]|[A-Za-z][A-Za-z0-9_]*)/.exec(text.slice(pos));
    if (!match) return fail(`Símbolo no reconocido en la posición ${pos + 1}: «${text[pos]}».`, "unrecognizedSymbol", { value1: pos + 1, value2: text[pos] });
    if (match[0] === "<->" || match[0] === "↔") return fail("El bicondicional no se usa en este ejercicio.", "rewrite.unsupportedConnective", { value: "↔" });
    tokens.push(aliases[match[0]] ?? match[0]);
    pos += match[0].length;
  }
  if (tokens.length > MAX_FORMULA_TOKENS) return fail("La fórmula tiene demasiados elementos.", "tooManyTokens");

  const sig = ctx.language === "predicate" ? ctx.signature : undefined;
  const variables = sig ? signatureVariables(sig) : [];
  const functions = sig?.functions ?? {};
  const has = (o: Record<string, number>, k: string) => Object.hasOwn(o, k);
  const atoms = ctx.language === "propositional" ? ctx.atoms : [];
  const freeSymbols = new Map<string, number>();
  let index = 0;
  let depth = 0;
  const peek = () => tokens[index];
  const isName = (t: string | undefined): t is string => t !== undefined && identifier.test(t);
  const enter = () => {
    if (++depth > MAX_FORMULA_DEPTH) fail("Hay demasiados niveles de anidación.", "tooDeep");
  };
  const list = () => (sig ? [...Object.keys(sig.predicates), ...sig.constants, ...variables] : atoms).join(", ");

  function args_(name: string, expected: number | undefined): Term[] {
    index++;
    if (peek() === ")") return fail("Se esperaba un término.", "predicates.expectedTerm");
    const args: Term[] = [term()];
    while (peek() === ",") {
      index++;
      args.push(term());
    }
    if (peek() !== ")") return fail("Falta un paréntesis de cierre.", "missingClosingParenthesis");
    index++;
    if (expected !== undefined && args.length !== expected)
      return fail(`«${name}» tiene aridad ${expected} pero se usa con ${args.length} argumento(s).`, "predicates.arityMismatch", { value1: name, value2: expected, value3: args.length });
    return args;
  }

  function term(): Term {
    enter();
    const name = tokens[index++];
    if (!isName(name)) return fail("Se esperaba un término.", "predicates.expectedTerm");
    let result: Term;
    if (sig && has(functions, name)) {
      if (peek() !== "(") return fail(`«${name}» es una función: escribe sus argumentos entre paréntesis.`, "predicates.functionArityMismatch", { value1: name, value2: functions[name], value3: 0 });
      const args = args_(name, functions[name]);
      result = { kind: "fn", name, args };
    } else if (variables.includes(name)) result = { kind: "var", name };
    else if (sig?.constants.includes(name)) result = { kind: "const", name };
    else if (sig && has(sig.predicates, name)) return fail(`«${name}» es un predicado, no un término.`, "predicates.predicateAsTerm", { value1: name });
    else if (options.allowSkolem && sig) {
      const args = peek() === "(" ? args_(name, undefined) : [];
      const known = freeSymbols.get(name);
      if (known !== undefined && known !== args.length)
        return fail(`«${name}» se usa con distinta aridad.`, "predicates.functionArityMismatch", { value1: name, value2: known, value3: args.length });
      freeSymbols.set(name, args.length);
      result = args.length ? { kind: "fn", name, args } : { kind: "const", name };
    } else return fail(`El símbolo «${name}» no está declarado.`, "predicates.unknownSymbol", { value1: name });
    depth--;
    return result;
  }

  function unary(): RFormula {
    enter();
    let result: RFormula;
    const token = peek();
    if (token === "¬") {
      index++;
      result = not(unary());
    } else if (token === "■" || token === "□") {
      index++;
      result = token === "■" ? TOP : BOTTOM;
    } else if (token === "∀" || token === "∃") {
      if (!sig) return fail("Se esperaba un átomo, una negación o un paréntesis de apertura.", "expectedAtom");
      index++;
      const variable = tokens[index++];
      if (!isName(variable)) return fail("Tras un cuantificador se esperaba una variable.", "predicates.expectedVariable");
      if (!variables.includes(variable))
        return fail(`«${variable}» no es una variable declarada. Variables: ${variables.join(", ")}.`, "predicates.undeclaredVariable", { value1: variable, value2: variables.join(", ") });
      result = { kind: token === "∀" ? "forall" : "exists", variable, body: unary() };
    } else if (token === "(") {
      index++;
      result = relation();
      if (peek() !== ")") return fail("Falta un paréntesis de cierre.", "missingClosingParenthesis");
      index++;
    } else {
      const name = tokens[index++];
      if (!isName(name)) return fail(sig ? "Se esperaba un predicado, una negación, un cuantificador o un paréntesis de apertura." : "Se esperaba un átomo, una negación o un paréntesis de apertura.", sig ? "predicates.expectedFormula" : "expectedAtom");
      if (!sig) {
        if (!atoms.includes(name)) return fail(`El átomo «${name}» no está definido. Usa ${atoms.join(", ")}.`, "unknownAtom", { value1: name, value2: atoms.join(", ") });
        result = { kind: "pred", name, args: [] };
      } else {
        if (!has(sig.predicates, name)) {
          if (variables.includes(name) || sig.constants.includes(name) || has(functions, name)) return fail(`«${name}» no es un predicado.`, "predicates.termAsFormula", { value1: name });
          return fail(`El predicado «${name}» no está declarado. Símbolos disponibles: ${list()}.`, "predicates.unknownPredicate", { value1: name, value2: list() });
        }
        const arity = sig.predicates[name];
        if (peek() === "(") result = { kind: "pred", name, args: args_(name, arity) };
        else if (arity === 0) result = { kind: "pred", name, args: [] };
        else return fail(`«${name}» tiene aridad ${arity} pero se usa con 0 argumento(s).`, "predicates.arityMismatch", { value1: name, value2: arity, value3: 0 });
      }
    }
    depth--;
    return result;
  }
  function and(): RFormula {
    let n = unary();
    while (peek() === "∧") {
      index++;
      n = { kind: "and", left: n, right: unary() };
    }
    return n;
  }
  function or(): RFormula {
    let n = and();
    while (peek() === "∨") {
      index++;
      n = { kind: "or", left: n, right: and() };
    }
    return n;
  }
  function relation(): RFormula {
    let n = or();
    if (peek() === "→") {
      index++;
      n = { kind: "implies", left: n, right: or() };
      if (peek() === "→") return fail("Agrupa los condicionales con paréntesis para aclarar su alcance.", "ambiguousRelations");
    }
    return n;
  }
  const root = relation();
  if (index !== tokens.length) return fail(`Elemento inesperado: «${peek()}». Revisa los paréntesis y las conectivas.`, "unexpectedElement", { value1: peek() });
  return root;
}

// ---------------------------------------------------------------- formas normales

const isLiteral = (f: RFormula) => f.kind === "pred" || (f.kind === "not" && f.value.kind === "pred");
const isClause = (f: RFormula) => flatten(f, "or").every(isLiteral);
const isCnfMatrix = (f: RFormula) => flatten(f, "and").every(isClause);

type NormalFormReason = "implication" | "negation" | "distribution" | "constants" | "quantifiers" | "existential";

function normalFormProblem(language: FormulaContext["language"], f: RFormula): NormalFormReason | undefined {
  let matrix = f;
  if (language === "predicate") {
    while (matrix.kind === "forall" || matrix.kind === "exists") {
      if (matrix.kind === "exists") return "existential";
      matrix = matrix.body;
    }
  }
  if (matrix.kind === "top" || matrix.kind === "bottom") return f === matrix ? undefined : "constants";
  if (isCnfMatrix(matrix)) return undefined;
  const has = (g: RFormula, test: (h: RFormula) => boolean): boolean => {
    if (test(g)) return true;
    switch (g.kind) {
      case "not":
        return has(g.value, test);
      case "forall":
      case "exists":
        return has(g.body, test);
      case "and":
      case "or":
      case "implies":
        return has(g.left, test) || has(g.right, test);
      default:
        return false;
    }
  };
  if (has(matrix, g => g.kind === "forall" || g.kind === "exists")) return "quantifiers";
  if (has(matrix, g => g.kind === "implies")) return "implication";
  if (has(matrix, g => g.kind === "top" || g.kind === "bottom")) return "constants";
  if (has(matrix, g => g.kind === "not" && g.value.kind !== "pred")) return "negation";
  return "distribution";
}

/** FNC (enunciados) o FNS (predicados: prefijo solo ∀ y matriz en FNC). ■ y □ solo como fórmula entera. */
export function isNormalForm(ctx: FormulaContext, f: RFormula | string): boolean {
  const formula = typeof f === "string" ? parseRewriteFormula(ctx, f, { allowSkolem: true }) : f;
  return normalFormProblem(ctx.language, formula) === undefined;
}

/**
 * Cláusulas de una fórmula en FNC/FNS (sin el prefijo ∀, sin simplificar: se conservan duplicadas y tautológicas;
 * solo se colapsan literales repetidos dentro de una cláusula, inherente a la representación como conjunto).
 * ■ da conjunto vacío; □ da una cláusula vacía. Lanza DomainError `rewrite.notNormalForm` si no es forma normal.
 */
export type NormalFormClauses =
  | { language: "propositional"; clauses: ClauseSet; texts: string[] }
  | { language: "predicate"; clauses: PClause[]; texts: string[] };

export function normalFormToClauses(ctx: FormulaContext, formulaText: string): NormalFormClauses {
  const f = parseRewriteFormula(ctx, formulaText, { allowSkolem: true });
  const problem = normalFormProblem(ctx.language, f);
  if (problem)
    throw new DomainError("La fórmula no está en forma normal.", "rewrite.notNormalForm" as MessageCode, { form: ctx.language === "predicate" ? "FNS" : "FNC", reason: problem });
  let matrix = f;
  while (matrix.kind === "forall") matrix = matrix.body;
  const rows: RFormula[][] = matrix.kind === "top" ? [] : matrix.kind === "bottom" ? [[]] : flatten(matrix, "and").map(c => flatten(c, "or"));
  if (ctx.language === "propositional") {
    const clauses = rows.map(r => normalizeClause(r.map(l => (l.kind === "not" ? { atom: (l.value as { name: string }).name, negated: true } : { atom: (l as { name: string }).name, negated: false }))));
    return { language: "propositional", clauses, texts: clauses.map(formatClause) };
  }
  const clauses = rows.map(r =>
    normalizePClause(r.map(l => (l.kind === "not" ? { negated: true, name: (l.value as { name: string }).name, args: (l.value as { args: Term[] }).args } : { negated: false, name: (l as { name: string }).name, args: (l as { args: Term[] }).args }))),
  );
  return { language: "predicate", clauses, texts: clauses.map(formatPClause) };
}

// ---------------------------------------------------------------- leyes

const propositionalLaws: LawId[] = [
  "imp", "deMorganAnd", "deMorganOr", "doubleNeg", "distribOrAnd", "idemAnd", "idemOr", "contradiction", "tautology",
  "neutralAnd", "absorbOrTop", "absorbAndBottom", "neutralOr", "absorbAnd", "absorbOr", "fnc",
];
const predicateLaws: LawId[] = [
  ...propositionalLaws.filter(l => l !== "fnc"),
  "notForall", "notExists", "renameForall", "renameExists", "moveForall", "skolem", "fns",
];

export const lawsFor = (language: FormulaContext["language"]): LawId[] => [...(language === "predicate" ? predicateLaws : propositionalLaws)];

const labels: Record<LawId, string> = {
  imp: "A → B = ¬A ∨ B",
  deMorganAnd: "¬(A ∧ B) = ¬A ∨ ¬B",
  deMorganOr: "¬(A ∨ B) = ¬A ∧ ¬B",
  doubleNeg: "¬¬A = A",
  distribOrAnd: "A ∨ (B ∧ C) = (A ∨ B) ∧ (A ∨ C)",
  idemAnd: "A ∧ A = A",
  idemOr: "A ∨ A = A",
  contradiction: "A ∧ ¬A = □",
  tautology: "A ∨ ¬A = ■",
  neutralAnd: "A ∧ ■ = A",
  absorbOrTop: "A ∨ ■ = ■",
  absorbAndBottom: "A ∧ □ = □",
  neutralOr: "A ∨ □ = A",
  absorbAnd: "A ∧ (A ∨ B) = A",
  absorbOr: "A ∨ (A ∧ B) = A",
  notForall: "¬∀x A = ∃x ¬A",
  notExists: "¬∃x A = ∀x ¬A",
  renameForall: "∀x A(x) = ∀y A(y)",
  renameExists: "∃x A(x) = ∃y A(y)",
  moveForall: "Mover cuantificadores universales a la izquierda",
  skolem: "Skolemización",
  fnc: "FNC",
  fns: "FNS",
};
export const lawLabel = (id: LawId): string => labels[id];

type Pos = { universals: string[]; positive: boolean };
type Gen = (f: RFormula, pos: Pos) => RFormula[];

const MAX_RESULTS = 20000;

function subsets<T>(items: T[]): T[][] {
  if (!items.length) return [];
  if (items.length > 6) return [items];
  const out: T[][] = [];
  for (let mask = 1; mask < 1 << items.length; mask++) out.push(items.filter((_, i) => mask & (1 << i)));
  return out;
}

function bipartitions<T>(items: T[]): [T[], T[]][] {
  if (items.length < 2) return [];
  const rest = items.slice(1);
  if (rest.length > 8) return [[[items[0]], rest]];
  const out: [T[], T[]][] = [];
  for (let mask = 0; mask < (1 << rest.length) - 1; mask++)
    out.push([[items[0], ...rest.filter((_, i) => mask & (1 << i))], rest.filter((_, i) => !(mask & (1 << i)))]);
  return out;
}

const same = (a: RFormula, b: RFormula) => strictKey(a) === strictKey(b);
const without = <T>(items: T[], ...skip: number[]) => items.filter((_, i) => !skip.includes(i));

const idem = (kind: "and" | "or"): Gen => f => {
  if (f.kind !== kind) return [];
  const ch = flatten(f, kind);
  const keys = ch.map(strictKey);
  const out: RFormula[] = [];
  for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) if (keys[i] === keys[j]) out.push(build(kind, without(ch, j)));
  return out;
};

const complement = (kind: "and" | "or", constant: RFormula): Gen => f => {
  if (f.kind !== kind) return [];
  const ch = flatten(f, kind);
  const out: RFormula[] = [];
  ch.forEach((c, i) => ch.forEach((d, j) => {
    if (i !== j && c.kind === "not" && same(c.value, d)) out.push(build(kind, [...without(ch, i, j), constant]));
  }));
  return out;
};

const neutral = (kind: "and" | "or", constantKind: "top" | "bottom"): Gen => f => {
  if (f.kind !== kind) return [];
  const ch = flatten(f, kind);
  return ch.flatMap((c, i) => (c.kind === constantKind ? [build(kind, without(ch, i))] : []));
};

const absorbConstant = (kind: "and" | "or", constantKind: "top" | "bottom"): Gen => f => {
  if (f.kind !== kind) return [];
  const ch = flatten(f, kind);
  const out: RFormula[] = [];
  ch.forEach((c, i) => {
    if (c.kind !== constantKind) return;
    const others = ch.map((_, k) => k).filter(k => k !== i);
    for (const s of subsets(others)) out.push(build(kind, [...others.filter(k => !s.includes(k)).map(k => ch[k]), c]));
  });
  return out;
};

const absorption = (kind: "and" | "or", other: "and" | "or"): Gen => f => {
  if (f.kind !== kind) return [];
  const ch = flatten(f, kind);
  const out: RFormula[] = [];
  ch.forEach((c, i) => ch.forEach((d, j) => {
    if (i !== j && d.kind === other && flatten(d, other).some(e => same(e, c))) out.push(build(kind, without(ch, j)));
  }));
  return out;
};

const distribOrAnd: Gen = f => {
  if (f.kind !== "or") return [];
  const ch = flatten(f, "or");
  const out: RFormula[] = [];
  ch.forEach((c, j) => {
    if (c.kind !== "and") return;
    const e = flatten(c, "and");
    const others = ch.map((_, k) => k).filter(k => k !== j);
    for (const s of subsets(others)) {
      const a = build("or", s.map(k => ch[k]));
      const keep = others.filter(k => !s.includes(k)).map(k => ch[k]);
      const wrap = (inner: RFormula) => build("or", [...keep, inner]);
      for (const [l, r] of bipartitions(e))
        out.push(wrap(build("and", [build("or", [a, build("and", l)]), build("or", [a, build("and", r)])])));
      if (e.length > 2) out.push(wrap(build("and", e.map(x => build("or", [a, x])))));
    }
  });
  return out;
};

const deMorgan = (inner: "and" | "or", outer: "and" | "or"): Gen => f => {
  if (f.kind !== "not" || f.value.kind !== inner) return [];
  const e = flatten(f.value, inner);
  return [build(outer, e.map(not)), ...bipartitions(e).map(([l, r]) => build(outer, [not(build(inner, l)), not(build(inner, r))]))];
};

const quantifierNot = (from: "forall" | "exists"): Gen => f =>
  f.kind === "not" && f.value.kind === from ? [{ kind: from === "forall" ? "exists" : "forall", variable: f.value.variable, body: not(f.value.body) }] : [];

const rename = (kind: "forall" | "exists", variables: string[]): Gen => f => {
  if (f.kind !== kind) return [];
  const out: RFormula[] = [];
  const free = freeVars(f.body);
  for (const y of variables) {
    if (y === f.variable || free.has(y)) continue;
    const body = substVar(f.body, f.variable, { kind: "var", name: y });
    if (body) out.push({ kind, variable: y, body });
  }
  return out;
};

const moveForall = (variables: string[]): Gen => f => {
  if (f.kind !== "and" && f.kind !== "or") return [];
  const ch = flatten(f, f.kind);
  const out: RFormula[] = [];
  ch.forEach((c, i) => {
    if (c.kind !== "forall") return;
    const others = ch.map((_, k) => k).filter(k => k !== i);
    for (const s of subsets(others)) {
      const group = s.map(k => ch[k]);
      const keep = others.filter(k => !s.includes(k)).map(k => ch[k]);
      const fvGroup = new Set(group.flatMap(g => [...freeVars(g)]));
      const wrap = (inner: RFormula) => build(f.kind as "and" | "or", [...keep, inner]);
      for (const y of [c.variable, ...variables.filter(v => v !== c.variable)]) {
        if (fvGroup.has(y)) continue;
        if (y !== c.variable && freeVars(c.body).has(y)) continue;
        const body = y === c.variable ? c.body : substVar(c.body, c.variable, { kind: "var", name: y });
        if (body) out.push(wrap({ kind: "forall", variable: y, body: build(f.kind as "and" | "or", [body, ...group]) }));
      }
      const chain: string[] = [];
      let inner: RFormula = c;
      while (inner.kind === "forall") {
        chain.push(inner.variable);
        inner = inner.body;
      }
      if (chain.length > 1 && chain.every(v => !fvGroup.has(v)))
        out.push(wrap(chain.reduceRight<RFormula>((body, variable) => ({ kind: "forall", variable, body }), build(f.kind as "and" | "or", [inner, ...group]))));
    }
  });
  return out;
};

const skolem: Gen = (f, pos) => {
  if (f.kind !== "exists" || !pos.positive) return [];
  const args: Term[] = [...new Set(pos.universals)].map(name => ({ kind: "var", name }));
  const term: Term = args.length ? { kind: "fn", name: SK, args } : { kind: "const", name: SK };
  const body = substVar(f.body, f.variable, term);
  return body ? [body] : [];
};

type RewriteLaw = Exclude<LawId, "fnc" | "fns">;
const generators = (variables: string[]): Record<RewriteLaw, Gen> => ({
  imp: f => (f.kind === "implies" ? [{ kind: "or", left: not(f.left), right: f.right }] : []),
  deMorganAnd: deMorgan("and", "or"),
  deMorganOr: deMorgan("or", "and"),
  doubleNeg: f => (f.kind === "not" && f.value.kind === "not" ? [f.value.value] : []),
  distribOrAnd,
  idemAnd: idem("and"),
  idemOr: idem("or"),
  contradiction: complement("and", BOTTOM),
  tautology: complement("or", TOP),
  neutralAnd: neutral("and", "top"),
  absorbOrTop: absorbConstant("or", "top"),
  absorbAndBottom: absorbConstant("and", "bottom"),
  neutralOr: neutral("or", "bottom"),
  absorbAnd: absorption("and", "or"),
  absorbOr: absorption("or", "and"),
  notForall: quantifierNot("forall"),
  notExists: quantifierNot("exists"),
  renameForall: rename("forall", variables),
  renameExists: rename("exists", variables),
  moveForall: moveForall(variables),
  skolem,
});

/** Todos los resultados de aplicar `gen` una vez sobre alguna subfórmula de `f`. */
function rewritesAnywhere(f: RFormula, gen: Gen, pos: Pos = { universals: [], positive: true }): RFormula[] {
  const out: RFormula[] = [...gen(f, pos)];
  const add = (r: RFormula[], wrap: (x: RFormula) => RFormula) => {
    for (const x of r) if (out.length < MAX_RESULTS) out.push(wrap(x));
  };
  switch (f.kind) {
    case "not":
      add(rewritesAnywhere(f.value, gen, { ...pos, positive: !pos.positive }), value => not(value));
      break;
    case "and":
    case "or": {
      const ch = flatten(f, f.kind);
      ch.forEach((c, i) => add(rewritesAnywhere(c, gen, pos), x => build(f.kind as "and" | "or", ch.map((d, k) => (k === i ? x : d)))));
      break;
    }
    case "implies":
      add(rewritesAnywhere(f.left, gen, { ...pos, positive: !pos.positive }), left => ({ kind: "implies", left, right: f.right }));
      add(rewritesAnywhere(f.right, gen, pos), right => ({ kind: "implies", left: f.left, right }));
      break;
    case "forall":
    case "exists":
      add(rewritesAnywhere(f.body, gen, f.kind === "forall" ? { ...pos, universals: [...pos.universals, f.variable] } : pos), body => ({ kind: f.kind, variable: f.variable, body }));
      break;
  }
  return out;
}

// ---------------------------------------------------------------- corrector de un paso

const syntaxFailure = (error: unknown): NormalFormCheck => {
  if (error instanceof DomainError) return { ok: false, code: error.code, params: error.params };
  throw error;
};

/**
 * Comprueba un paso de forma normal: `previous` es el texto de la fórmula anterior (la del sistema) y `step` la ley
 * elegida con el resultado escrito. En terminales (`fnc`, `fns`) solo importa que `previous` ya sea forma normal.
 * Con `skolem` correcto devuelve `skolemSymbols` (símbolo nuevo y aridad) para añadir a la signatura del ejercicio
 * (`constants` si aridad 0, `functions` si no) antes de los pasos siguientes y de otras fórmulas del mismo ejercicio.
 */
export function checkNormalFormStep(ctx: FormulaContext, previous: string, step: NormalFormStep): NormalFormCheck {
  const law = step.law;
  const params = { law: lawLabel(law) };
  const allowed = lawsFor(ctx.language);
  if (!allowed.includes(law)) return { ok: false, code: "rewrite.lawNotAllowedForLanguage" as MessageCode, params };
  let prev: RFormula;
  try {
    prev = parseRewriteFormula(ctx, previous, { allowSkolem: true });
  } catch {
    return { ok: false, code: "rewrite.previousInvalid" as MessageCode };
  }
  if (law === "fnc" || law === "fns") {
    const reason = normalFormProblem(ctx.language, prev);
    if (reason) return { ok: false, code: "rewrite.notNormalForm" as MessageCode, params: { form: lawLabel(law), reason } };
    return { ok: true, result: formatRewriteFormula(prev) };
  }
  if (!step.result.trim()) return { ok: false, code: "formulaRequired" };
  let result: RFormula;
  try {
    result = parseRewriteFormula(ctx, step.result, { allowSkolem: true });
  } catch (error) {
    return syntaxFailure(error);
  }
  const variables = ctx.language === "predicate" ? signatureVariables(ctx.signature) : [];
  const candidates = rewritesAnywhere(prev, generators(variables)[law]);
  if (!candidates.length) return { ok: false, code: "rewrite.lawNotApplicable" as MessageCode, params };

  // Símbolos nuevos (ni en la signatura ni en la fórmula anterior) del resultado.
  const known = termSymbols(prev).names;
  if (ctx.language === "predicate") {
    for (const n of [...(ctx.signature.constants), ...Object.keys(ctx.signature.functions ?? {})]) known.add(n);
  }
  const resultSymbols = termSymbols(result);
  const fresh = [...resultSymbols.names].filter(n => !known.has(n));
  const text = formatRewriteFormula(result);
  const resultKey = strictKey(result);

  if (law !== "skolem") {
    if (fresh.length) return { ok: false, code: "predicates.unknownSymbol", params: { value1: fresh[0] } };
    if (candidates.some(c => strictKey(c) === resultKey)) return { ok: true, result: text };
    if (resultKey === strictKey(prev)) return { ok: false, code: "rewrite.noChange" as MessageCode, params };
    return { ok: false, code: "rewrite.resultMismatch" as MessageCode, params };
  }

  // Skolem: los candidatos llevan el símbolo ficticio «§»; se sustituye por el símbolo nuevo del usuario.
  const plain = candidates.filter(c => !hasSkolemPlaceholder(c));
  if (!fresh.length && plain.some(c => strictKey(c) === resultKey)) return { ok: true, result: text };
  const withSymbol = candidates.filter(hasSkolemPlaceholder);
  if (fresh.length === 1) {
    const [symbol] = fresh;
    const arity = resultSymbols.arities.get(symbol) ?? 0;
    for (const c of withSymbol)
      if (strictKey(renameSymbol(c, SK, symbol)) === resultKey) return { ok: true, result: text, skolemSymbols: [{ name: symbol, arity }] };
    for (const c of withSymbol)
      if (strictKey(hideSymbol(result, symbol)) === strictKey(hideSymbol(c, SK))) {
        const expected = termSymbols(c).arities.get(SK) ?? 0;
        return { ok: false, code: "rewrite.skolemArguments" as MessageCode, params: { symbol, expected } };
      }
    return { ok: false, code: "rewrite.resultMismatch" as MessageCode, params };
  }
  if (!fresh.length) {
    // ¿El resultado es correcto salvo que reutiliza un símbolo ya existente como símbolo de Skolem?
    for (const name of resultSymbols.names) {
      const shape = strictKey(hideSymbol(result, name));
      if (withSymbol.some(c => strictKey(renameSymbol(c, SK, name)) === resultKey || strictKey(hideSymbol(c, SK)) === shape)) return { ok: false, code: "rewrite.skolemSymbolNotFresh" as MessageCode, params: { symbol: name } };
    }
  }
  if (resultKey === strictKey(prev)) return { ok: false, code: "rewrite.noChange" as MessageCode, params };
  return { ok: false, code: "rewrite.resultMismatch" as MessageCode, params };
}

/**
 * Todos los resultados posibles de aplicar `law` una vez a `previous` (texto canónico, sin repetidos).
 * Pensado para herramientas de autoría y tests; para skolem, el símbolo ficticio se sustituye por `skolemName`.
 */
export function candidateResults(ctx: FormulaContext, previous: string, law: RewriteLaw, skolemName = "sk1"): string[] {
  const prev = parseRewriteFormula(ctx, previous, { allowSkolem: true });
  const variables = ctx.language === "predicate" ? signatureVariables(ctx.signature) : [];
  const texts = rewritesAnywhere(prev, generators(variables)[law]).map(c => formatRewriteFormula(c).split(SK).join(skolemName));
  return [...new Set(texts)];
}

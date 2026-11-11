/**
 * Comprobador de deducción natural (enunciados).
 *
 * FORMATO DE RESPUESTA (una línea por paso, líneas en blanco ignoradas):
 *
 *     [marcadores] n. fórmula ; regla ; citas
 *
 * - marcadores: cero o más `>` (también `|` y `│`), antes del número (`> 3. P ; ...`) o justo después de él
 *   (`3. > P ; ...`, forma recomendada); su número total es la profundidad de subprueba (0 = demostración
 *   principal). Se admiten espacios entre ellos.
 * - n: número de línea; deben ser 1, 2, 3... consecutivos. Tras el número vale `.` o `)`.
 * - fórmula: sintaxis de parseFormula (alias ASCII `-> <-> ~ ! & |`), o `⊥` (también `_|_`).
 * - regla: ver `canonicalRule`; insensible a mayúsculas/espacios/acentos. Ejemplos: `∧I`, `&E`, `->I`, `andI`,
 *   `impE`, `∨E`, `¬I`, `¬E`, `⊥E`, `RAA`, `↔I`, `Premisa`, `Hip`, `Reit`.
 * - citas: lista separada por comas de números (`2`) o rangos de subprueba (`3-5`), en cualquier orden.
 *   Premisa e Hipótesis no llevan citas. Un rango `a-b` cita la subprueba que empieza en la hipótesis `a` y
 *   termina en la línea `b`.
 *
 * Subpruebas: una línea con regla Hipótesis abre una subprueba en su profundidad d (1 <= d <= profundidad
 * de la línea anterior + 1) y cierra cualquier subprueba abierta de profundidad >= d. Una línea que no es
 * hipótesis tiene profundidad <= la de la línea anterior (bajarla cierra subpruebas). Las premisas solo van
 * en profundidad 0.
 *
 * Ejemplo (P → Q, Q → R ⊢ P → R):
 *     1. P → Q ; Premisa
 *     2. Q → R ; Premisa
 *     3. > P ; Hipótesis
 *     4. > Q ; →E ; 1, 3
 *     5. > R ; →E ; 2, 4
 *     6. P → R ; →I ; 3-5
 *
 * REGLAS (nombre canónico: cita(s) → conclusión):
 *   Premisa      -                      fórmula igual a una premisa dada
 *   Hipótesis    -                      abre subprueba
 *   Reiteración  A                      A
 *   ∧I           A, B                   A∧B (cualquier orden)
 *   ∧E           A∧B                    A o B
 *   ∨I           A                      A∨B o B∨A
 *   ∨E           A∨B, [A..C], [B..C]    C
 *   →I           [A..B]                 A→B
 *   →E           A→B, A                 B
 *   ¬I           [A..⊥]                 ¬A
 *   ¬E (= ⊥I)    A, ¬A                  ⊥
 *   ⊥E           ⊥                      cualquier fórmula
 *   RAA          [¬A..⊥]                A
 *   ↔I           [A..B], [B..A]  o  A→B, B→A     A↔B
 *   ↔E           A↔B, A (o B)           B (o A)
 *   ∀E           ∀x A                   A[t/x]            (solo predicados; t libre para x en A)
 *   ∀I           A[a/x]                 ∀x A              (a variable no libre en ∀x A, premisas ni hipótesis abiertas de la línea)
 *   ∃I           A[t/x]                 ∃x A              (t libre para x en A)
 *   ∃E           ∃x A, [A[a/x]..C]      C                 (a variable no libre en ∃x A, C, premisas ni otras hipótesis abiertas)
 *
 * `options.rules` (nombres canónicos) restringe las reglas de inferencia permitidas; Premisa e Hipótesis
 * siempre se permiten, Reiteración solo si se lista.
 *
 * GENERALIZACIÓN: la lógica de reglas solo ve fórmulas a través de `FormulaSystem` (parse/format/equals/view).
 * Para predicados basta una nueva instancia (con view para "forall"/"exists", igualdad módulo renombrado y
 * sustitución) y añadir reglas nuevas a `checkLine`/`canonicalRule` (∀I, ∀E, ∃I, ∃E).
 *
 * RESULTADO: { status: "correct" | "incorrect" | "invalid", line?, messageCode, messageParams?, message }.
 *   "invalid": la respuesta no se puede leer (sintaxis); "incorrect": se lee pero hay un error lógico.
 *
 * CÓDIGOS (clave i18n `errors.<código>`); params siempre incluyen `line` cuando hay línea:
 *   deduction.correct
 *   deduction.empty              sin líneas
 *   deduction.tooLong            respuesta > MAX_ANSWER_LENGTH
 *   deduction.tooManyLines       > MAX_PROOF_LINES            (max)
 *   deduction.lineSyntax         línea ilegible               (line)
 *   deduction.lineNumber         numeración               (line, expected)
 *   deduction.unknownRule        regla desconocida            (line, rule)
 *   deduction.badCitations       citas mal escritas           (line, value)
 *   deduction.formula            fórmula ilegible             (line, detail)
 *   deduction.ruleNotAllowed     regla no permitida           (line, rule)
 *   deduction.depth              profundidad incoherente      (line)
 *   deduction.premiseDepth       premisa dentro de subprueba  (line)
 *   deduction.premiseNotGiven    premisa que no es dato       (line)
 *   deduction.citeCount          nº de citas incorrecto       (line, rule, expected)
 *   deduction.citeMissing        cita inexistente             (line, cite)
 *   deduction.citeLater          cita la propia línea o posterior (line, cite)
 *   deduction.citeClosed         línea de subprueba cerrada   (line, cite)
 *   deduction.citeOpenBox        subprueba aún abierta        (line, cite)
 *   deduction.citeNotBox         rango que no es subprueba completa (line, cite)
 *   deduction.citeKind           se esperaba línea/subprueba  (line, rule, expected)
 *   deduction.lineRule           regla mal aplicada           (line, rule, detail)
 *   deduction.openHypothesis     última línea dentro de subprueba (line)
 *   deduction.notConclusion      la última línea no es la conclusión (line, conclusion)
 *   (solo predicados)
 *   deduction.captured           la sustitución captura una variable (line, rule, term)
 *   deduction.notVariable        el término de ∀I/∃E no es una variable (line, rule, term)
 *   deduction.eigenQuantified    variable arbitraria libre en la fórmula cuantificada (line, rule, variable)
 *   deduction.eigenConclusion    variable de ∃E libre en la conclusión (line, rule, variable)
 *   deduction.eigenPremise       variable arbitraria libre en una premisa (line, rule, variable)
 *   deduction.eigenHypothesis    variable arbitraria libre en una hipótesis abierta (line, rule, variable, hypothesis)
 */
import { MAX_ANSWER_LENGTH } from "./limits";
import { formatFormula } from "./evaluation";
import { parseFormula } from "./parser";
import type { MessageCode, MessageParams } from "../errors";
import { DomainError } from "../errors";
import type { Node } from "./types";

export const MAX_PROOF_LINES = 60;

export type ProofRule =
  | "Premisa"
  | "Hipótesis"
  | "Reiteración"
  | "∧I"
  | "∧E"
  | "∨I"
  | "∨E"
  | "→I"
  | "→E"
  | "¬I"
  | "¬E"
  | "⊥E"
  | "RAA"
  | "↔I"
  | "↔E"
  | "∀I"
  | "∀E"
  | "∃I"
  | "∃E";

export const inferenceRules: ProofRule[] = ["Reiteración", "∧I", "∧E", "∨I", "∨E", "→I", "→E", "¬I", "¬E", "⊥E", "RAA", "↔I", "↔E", "∀I", "∀E", "∃I", "∃E"];
/** Reglas que solo existen en el sistema con cuantificadores. */
export const quantifierRules: ProofRule[] = ["∀I", "∀E", "∃I", "∃E"];

export type ProofStatus = "correct" | "incorrect" | "invalid";
export type ProofResult = {
  status: ProofStatus;
  line?: number;
  messageCode: MessageCode;
  messageParams?: MessageParams;
  message: string;
};

export type Citation = { from: number; to: number };
export type ProofLine = {
  /** Número escrito por el estudiante (1-based). */
  number: number;
  depth: number;
  formula: string;
  rule: ProofRule;
  citations: Citation[];
};

// ---------------------------------------------------------------- abstracción de fórmulas

export type FormulaView<F> = { op: string; args: F[] };
/** Único punto que conoce la estructura de las fórmulas: igualdad, vista de conectivas y texto. */
export type FormulaSystem<F> = {
  parse(text: string, atoms: string[]): F;
  format(f: F): string;
  equals(a: F, b: F): boolean;
  /** op: "atom" | "bottom" | "not" | "and" | "or" | "implies" | "iff" (| "forall" | "exists" ...). */
  view(f: F): FormulaView<F>;
  /** Soporte de cuantificadores (solo predicados). Sin él, ∀I/∀E/∃I/∃E no están disponibles. */
  quant?: QuantifierSupport<F>;
};

export type InstanceMatch =
  | { status: "ok"; term: string; /** nombre si el término es una variable */ variable?: string; /** la variable no aparece libre en el cuerpo */ vacuous: boolean }
  | { status: "capture"; term: string }
  | { status: "none" };
export type QuantifierSupport<F> = {
  view(f: F): { kind: "forall" | "exists"; variable: string; body: F } | undefined;
  free(f: F): Set<string>;
  /** Busca un término t libre para `variable` en `body` tal que body[t/variable] sea igual a `target` (módulo α). */
  instance(body: F, variable: string, target: F): InstanceMatch;
};

export type PropFormula = Node | { kind: "bottom" };

const format = (f: PropFormula) => (f.kind === "bottom" ? "⊥" : formatFormula(f));

export const propositionalSystem: FormulaSystem<PropFormula> = {
  parse(text, atoms) {
    const t = text.trim();
    if (t === "⊥" || t === "_|_") return { kind: "bottom" };
    return parseFormula(t, atoms);
  },
  format,
  equals: (a, b) => format(a) === format(b),
  view(f) {
    switch (f.kind) {
      case "bottom":
        return { op: "bottom", args: [] };
      case "atom":
        return { op: "atom", args: [] };
      case "not":
        return { op: "not", args: [f.value] };
      default:
        return { op: f.kind, args: [f.left, f.right] };
    }
  },
};

// ---------------------------------------------------------------- reglas: nombres

const connectiveWords: Record<string, string> = {
  and: "∧", y: "∧", conj: "∧", "&": "∧", "^": "∧",
  or: "∨", o: "∨", disy: "∨", "|": "∨",
  imp: "→", impl: "→", implica: "→", cond: "→", "->": "→", "=>": "→",
  iff: "↔", bic: "↔", bicond: "↔", "<->": "↔", "<=>": "↔",
  not: "¬", neg: "¬", no: "¬", "~": "¬", "!": "¬",
  bot: "⊥", falso: "⊥", "_|_": "⊥",
  forall: "∀", all: "∀", todo: "∀", paratodo: "∀",
  exists: "∃", ex: "∃", existe: "∃",
};

function normalizeRuleName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s._]/g, (c) => (c === "_" ? "_" : ""));
}

const structuralAliases: Record<string, ProofRule> = {
  premisa: "Premisa", prem: "Premisa", p: "Premisa", dada: "Premisa",
  hipotesis: "Hipótesis", hip: "Hipótesis", h: "Hipótesis", supuesto: "Hipótesis",
  reiteracion: "Reiteración", reit: "Reiteración", r: "Reiteración", copia: "Reiteración",
  raa: "RAA", absurdo: "RAA", reduccionalabsurdo: "RAA",
};

/** Canoniza el nombre escrito de una regla; undefined si no se reconoce. */
export function canonicalRule(raw: string): ProofRule | undefined {
  const name = normalizeRuleName(raw);
  if (!name) return undefined;
  if (structuralAliases[name]) return structuralAliases[name];
  const m = /^(.+?)[-]?(i|e|intro|int|elim)$/.exec(name);
  if (!m) return undefined;
  const connective = connectiveWords[m[1]] ?? m[1];
  const side = m[2].startsWith("i") ? "I" : "E";
  const rule = `${connective}${side}`;
  if (rule === "⊥I") return "¬E";
  return inferenceRules.includes(rule as ProofRule) ? (rule as ProofRule) : undefined;
}

// ---------------------------------------------------------------- parseo de líneas

type Failure = ProofResult;
function fail(
  status: ProofStatus,
  line: number | undefined,
  code: string,
  message: string,
  params: MessageParams = {},
): Failure {
  const messageParams = line === undefined ? params : { line, ...params };
  return { status, line, messageCode: code as MessageCode, messageParams, message };
}

function parseCitations(text: string): Citation[] | undefined {
  const t = text.trim();
  if (!t) return [];
  const result: Citation[] = [];
  for (const part of t.split(",")) {
    const m = /^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/.exec(part);
    if (!m) return undefined;
    const from = Number(m[1]);
    result.push({ from, to: m[2] === undefined ? from : Number(m[2]) });
  }
  return result;
}

function parseProofLine(raw: string, expected: number): ProofLine | Failure {
  const m = /^\s*((?:[>|│]\s*)*)(\d+)\s*[.)]\s*((?:[>|│]\s*)*)(.*)$/.exec(raw);
  if (!m)
    return fail("invalid", expected, "deduction.lineSyntax", `Línea ${expected}: formato esperado «n. fórmula ; regla ; citas».`);
  const number = Number(m[2]);
  if (number !== expected)
    return fail("invalid", expected, "deduction.lineNumber", `Línea ${expected}: la numeración debe ser consecutiva (se esperaba ${expected}, se encontró ${number}).`, { expected });
  const fields = m[4].split(";");
  if (fields.length < 2 || fields.length > 3 || !fields[0].trim())
    return fail("invalid", number, "deduction.lineSyntax", `Línea ${number}: formato esperado «n. fórmula ; regla ; citas».`);
  const rule = canonicalRule(fields[1]);
  if (!rule)
    return fail("invalid", number, "deduction.unknownRule", `Línea ${number}: la regla «${fields[1].trim()}» no se reconoce.`, { rule: fields[1].trim() });
  const citations = parseCitations(fields[2] ?? "");
  if (!citations)
    return fail("invalid", number, "deduction.badCitations", `Línea ${number}: las citas «${(fields[2] ?? "").trim()}» no son válidas; usa números separados por comas o rangos como 3-5.`, { value: (fields[2] ?? "").trim() });
  return {
    number,
    depth: ((m[1] + m[3]).match(/[>|│]/g) ?? []).length,
    formula: fields[0].trim(),
    rule,
    citations,
  };
}

function splitLines(text: string): string[] | Failure {
  if (text.length > MAX_ANSWER_LENGTH)
    return fail("invalid", undefined, "deduction.tooLong", "La demostración es demasiado larga.");
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return fail("invalid", undefined, "deduction.empty", "Escribe la demostración para continuar.");
  if (lines.length > MAX_PROOF_LINES)
    return fail("invalid", undefined, "deduction.tooManyLines", `La demostración tiene demasiadas líneas (máximo ${MAX_PROOF_LINES}).`, { max: MAX_PROOF_LINES });
  return lines;
}

/** Análisis sintáctico (sin leer las fórmulas): se detiene en la primera línea ilegible. */
export function parseProof(text: string): { ok: true; lines: ProofLine[] } | { ok: false; error: ProofResult } {
  const raw = splitLines(text);
  if (!Array.isArray(raw)) return { ok: false, error: raw };
  const lines: ProofLine[] = [];
  for (const [i, l] of raw.entries()) {
    const parsed = parseProofLine(l, i + 1);
    if ("status" in parsed) return { ok: false, error: parsed };
    lines.push(parsed);
  }
  return { ok: true, lines };
}

// ---------------------------------------------------------------- comprobación

export type CheckProofOptions = {
  premises: string[];
  conclusion: string;
  atoms: string[];
  rules?: string[];
};

type Checked<F> = { number: number; depth: number; formula: F; chain: number[]; isHyp: boolean };
type Box = { depth: number; start: number; last: number };
type Cited<F> = { kind: "line"; f: F } | { kind: "box"; hyp: F; end: F };

const expectedCount: Record<ProofRule, number> = {
  Premisa: 0, Hipótesis: 0, Reiteración: 1, "∧I": 2, "∧E": 1, "∨I": 1, "∨E": 3, "→I": 1,
  "→E": 2, "¬I": 1, "¬E": 2, "⊥E": 1, RAA: 1, "↔I": 2, "↔E": 2,
  "∀I": 1, "∀E": 1, "∃I": 1, "∃E": 2,
};

/** Comprueba una demostración con el sistema proposicional. */
export function checkProof(text: string, options: CheckProofOptions): ProofResult {
  return checkProofWith(propositionalSystem, text, options);
}

export function checkProofWith<F>(sys: FormulaSystem<F>, text: string, options: CheckProofOptions): ProofResult {
  const raw = splitLines(text);
  if (!Array.isArray(raw)) return raw;
  const premises = options.premises.map(p => sys.parse(p, options.atoms));
  const goal = sys.parse(options.conclusion, options.atoms);
  const allowed = options.rules ? new Set(options.rules.map(r => canonicalRule(r) ?? r)) : undefined;

  const lines: Checked<F>[] = [];
  const boxes: Box[] = [];
  let stack: number[] = [];

  for (const [i, l] of raw.entries()) {
    const n = i + 1;
    const parsed = parseProofLine(l, n);
    if ("status" in parsed) return parsed;
    let formula: F;
    try {
      formula = sys.parse(parsed.formula, options.atoms);
    } catch (error) {
      if (error instanceof DomainError)
        return fail("invalid", n, "deduction.formula", `Línea ${n}: ${error.message}`, { detail: error.message });
      throw error;
    }
    const { rule, depth } = parsed;
    const isHyp = rule === "Hipótesis";
    const prevDepth = i === 0 ? 0 : lines[i - 1].depth;
    if (isHyp ? depth < 1 || depth > prevDepth + 1 : depth > prevDepth)
      return fail("incorrect", n, "deduction.depth", `Línea ${n}: la profundidad de subprueba es incoherente con la línea anterior.`);
    if (rule === "Premisa" && depth !== 0)
      return fail("incorrect", n, "deduction.premiseDepth", `Línea ${n}: las premisas solo pueden ir fuera de las subpruebas.`);
    if (allowed && !["Premisa", "Hipótesis"].includes(rule) && !allowed.has(rule))
      return fail("incorrect", n, "deduction.ruleNotAllowed", `Línea ${n}: la regla ${rule} no está permitida en este ejercicio.`, { rule });

    if (quantifierRules.includes(rule) && !sys.quant)
      return fail("incorrect", n, "deduction.ruleNotAllowed", `Línea ${n}: la regla ${rule} no está disponible en este ejercicio.`, { rule });

    stack = stack.slice(0, isHyp ? depth - 1 : depth);
    if (isHyp) {
      boxes.push({ depth, start: i, last: i });
      stack.push(boxes.length - 1);
    }
    const chain = [...stack];
    for (const id of chain) boxes[id].last = i;
    lines.push({ number: n, depth, formula, chain, isHyp });

    const current = lines[i];
    const err = checkLine(sys, current, i, rule, parsed.citations, lines, boxes, premises, raw.length);
    if (err) return err;
  }

  const last = lines[lines.length - 1];
  if (last.depth !== 0)
    return fail("incorrect", last.number, "deduction.openHypothesis", `Línea ${last.number}: la demostración termina dentro de una subprueba abierta; ciérrala antes de la conclusión.`);
  if (!sys.equals(last.formula, goal))
    return fail("incorrect", last.number, "deduction.notConclusion", `Línea ${last.number}: la última línea debe ser la conclusión ${sys.format(goal)}.`, { conclusion: sys.format(goal) });
  return { status: "correct", messageCode: "deduction.correct" as MessageCode, message: "Demostración correcta." };
}

function checkLine<F>(
  sys: FormulaSystem<F>,
  cur: Checked<F>,
  i: number,
  rule: ProofRule,
  citations: Citation[],
  lines: Checked<F>[],
  boxes: Box[],
  premises: F[],
  total: number,
): ProofResult | undefined {
  const n = cur.number;
  const f = cur.formula;
  if (rule === "Hipótesis") return undefined;
  if (rule === "Premisa") {
    return premises.some(p => sys.equals(p, f))
      ? undefined
      : fail("incorrect", n, "deduction.premiseNotGiven", `Línea ${n}: «${sys.format(f)}» no es una de las premisas del ejercicio.`);
  }
  if (citations.length !== expectedCount[rule] && !(rule === "∧I" && citations.length === 1))
    return fail("incorrect", n, "deduction.citeCount", `Línea ${n}: la regla ${rule} necesita ${expectedCount[rule]} cita(s).`, { rule, expected: expectedCount[rule] });

  // Resolver citas.
  const cited: Cited<F>[] = [];
  for (const c of citations) {
    if (c.from < 1 || c.to < 1 || c.from > total || c.to > total)
      return fail("incorrect", n, "deduction.citeMissing", `Línea ${n}: la línea citada ${c.from === c.to ? c.from : `${c.from}-${c.to}`} no existe.`, { cite: c.from === c.to ? String(c.from) : `${c.from}-${c.to}` });
    const label = c.from === c.to ? String(c.from) : `${c.from}-${c.to}`;
    if (c.from - 1 >= i || c.to - 1 >= i)
      return fail("incorrect", n, "deduction.citeLater", `Línea ${n}: solo se pueden citar líneas anteriores (${label}).`, { cite: label });
    const a = lines[c.from - 1];
    if (c.from === c.to) {
      if (!a.chain.every((id, k) => cur.chain[k] === id))
        return fail("incorrect", n, "deduction.citeClosed", `Línea ${n}: la línea ${c.from} pertenece a una subprueba ya cerrada y no puede citarse.`, { cite: label });
      cited.push({ kind: "line", f: a.formula });
      continue;
    }
    const b = lines[c.to - 1];
    const boxId = a.chain[a.chain.length - 1];
    if (a.isHyp && boxId !== undefined && cur.chain.includes(boxId))
      return fail("incorrect", n, "deduction.citeOpenBox", `Línea ${n}: la subprueba ${label} aún no está cerrada.`, { cite: label });
    if (!a.isHyp || c.to < c.from || boxId === undefined || boxes[boxId].last !== c.to - 1 || b.depth !== boxes[boxId].depth || b.chain[b.chain.length - 1] !== boxId)
      return fail("incorrect", n, "deduction.citeNotBox", `Línea ${n}: ${label} no es una subprueba completa (debe empezar en una hipótesis y acabar en su última línea).`, { cite: label });
    if (!a.chain.slice(0, -1).every((id, k) => cur.chain[k] === id))
      return fail("incorrect", n, "deduction.citeClosed", `Línea ${n}: la subprueba ${label} pertenece a otra subprueba ya cerrada.`, { cite: label });
    cited.push({ kind: "box", hyp: a.formula, end: b.formula });
  }

  const bad = (detail?: string) =>
    fail("incorrect", n, "deduction.lineRule", `Línea ${n}: ${rule} no está bien aplicada${detail ? `: ${detail}` : "."}`, {
      rule,
      detail: detail ? `${detail[0].toUpperCase()}${detail.slice(1)}.` : "Revisa las líneas citadas y la fórmula obtenida.",
    });
  const kindError = (expected: string) =>
    fail("incorrect", n, "deduction.citeKind", `Línea ${n}: ${rule} necesita citar ${expected}.`, { rule, expected });
  const lineF = (k: number) => (cited[k]?.kind === "line" ? (cited[k] as { f: F }).f : undefined);
  const lines2 = cited.filter((c): c is { kind: "line"; f: F } => c.kind === "line").map(c => c.f);
  const boxes2 = cited.filter((c): c is { kind: "box"; hyp: F; end: F } => c.kind === "box");
  const eq = sys.equals;
  const v = (x: F) => sys.view(x);
  const covers = (given: F[], needed: F[]) =>
    given.every(g => needed.some(x => eq(g, x))) && needed.every(x => given.some(g => eq(g, x)));
  const isBottom = (x: F) => v(x).op === "bottom";

  switch (rule) {
    case "Reiteración": {
      const a = lineF(0);
      if (a === undefined) return kindError("una línea");
      return eq(a, f) ? undefined : bad("la línea debe ser idéntica a la citada");
    }
    case "∧I": {
      if (lines2.length !== cited.length) return kindError("líneas");
      const w = v(f);
      return w.op === "and" && covers(lines2, w.args) ? undefined : bad("debe ser la conjunción de las líneas citadas");
    }
    case "∧E": {
      const a = lineF(0);
      if (a === undefined) return kindError("una línea");
      const w = v(a);
      return w.op === "and" && w.args.some(x => eq(x, f)) ? undefined : bad("la línea citada debe ser una conjunción que contenga el resultado");
    }
    case "∨I": {
      const a = lineF(0);
      if (a === undefined) return kindError("una línea");
      const w = v(f);
      return w.op === "or" && w.args.some(x => eq(x, a)) ? undefined : bad("debe ser una disyunción con la línea citada en un lado");
    }
    case "∨E": {
      if (lines2.length !== 1 || boxes2.length !== 2) return kindError("una disyunción y dos subpruebas");
      const w = v(lines2[0]);
      if (w.op !== "or") return bad("la línea citada debe ser una disyunción");
      if (!covers(boxes2.map(b => b.hyp), w.args)) return bad("las hipótesis de las subpruebas deben ser los dos lados de la disyunción");
      return boxes2.every(b => eq(b.end, f)) ? undefined : bad("ambas subpruebas deben terminar en el resultado");
    }
    case "→I": {
      if (boxes2.length !== 1) return kindError("una subprueba");
      const w = v(f);
      return w.op === "implies" && eq(w.args[0], boxes2[0].hyp) && eq(w.args[1], boxes2[0].end)
        ? undefined
        : bad("debe ser hipótesis → última línea de la subprueba");
    }
    case "→E": {
      if (lines2.length !== 2) return kindError("dos líneas");
      for (const [a, b] of [[lines2[0], lines2[1]], [lines2[1], lines2[0]]]) {
        const w = v(a);
        if (w.op === "implies" && eq(w.args[0], b) && eq(w.args[1], f)) return undefined;
      }
      return bad("hacen falta A → B y A para concluir B");
    }
    case "¬I": {
      if (boxes2.length !== 1) return kindError("una subprueba");
      const w = v(f);
      if (w.op !== "not" || !eq(w.args[0], boxes2[0].hyp)) return bad("debe ser la negación de la hipótesis de la subprueba");
      return isBottom(boxes2[0].end) ? undefined : bad("la subprueba debe terminar en ⊥");
    }
    case "¬E": {
      if (lines2.length !== 2) return kindError("dos líneas");
      if (!isBottom(f)) return bad("el resultado debe ser ⊥");
      for (const [a, b] of [[lines2[0], lines2[1]], [lines2[1], lines2[0]]]) {
        const w = v(a);
        if (w.op === "not" && eq(w.args[0], b)) return undefined;
      }
      return bad("hacen falta A y ¬A");
    }
    case "⊥E": {
      const a = lineF(0);
      if (a === undefined) return kindError("una línea");
      return isBottom(a) ? undefined : bad("la línea citada debe ser ⊥");
    }
    case "RAA": {
      if (boxes2.length !== 1) return kindError("una subprueba");
      const w = v(boxes2[0].hyp);
      if (w.op !== "not" || !eq(w.args[0], f)) return bad("la hipótesis de la subprueba debe ser la negación del resultado");
      return isBottom(boxes2[0].end) ? undefined : bad("la subprueba debe terminar en ⊥");
    }
    case "↔I": {
      const w = v(f);
      if (w.op !== "iff") return bad("el resultado debe ser un bicondicional");
      const [a, b] = w.args;
      if (boxes2.length === 2 && lines2.length === 0) {
        const ok = (x: F, y: F) => boxes2.some(bx => eq(bx.hyp, x) && eq(bx.end, y));
        return ok(a, b) && ok(b, a) ? undefined : bad("hacen falta subpruebas A..B y B..A");
      }
      if (lines2.length === 2 && boxes2.length === 0) {
        const ok = (x: F, y: F) =>
          lines2.some(l => {
            const q = v(l);
            return q.op === "implies" && eq(q.args[0], x) && eq(q.args[1], y);
          });
        return ok(a, b) && ok(b, a) ? undefined : bad("hacen falta A → B y B → A");
      }
      return kindError("dos subpruebas o dos condicionales");
    }
    case "↔E": {
      if (lines2.length !== 2) return kindError("dos líneas");
      for (const [a, b] of [[lines2[0], lines2[1]], [lines2[1], lines2[0]]]) {
        const w = v(a);
        if (w.op !== "iff") continue;
        if ((eq(w.args[0], b) && eq(w.args[1], f)) || (eq(w.args[1], b) && eq(w.args[0], f))) return undefined;
      }
      return bad("hacen falta A ↔ B y uno de sus lados para concluir el otro");
    }
    case "∀E":
    case "∃I":
    case "∀I":
    case "∃E": {
      const quant = sys.quant;
      if (!quant) return bad();
      const captured = (term: string) =>
        fail("incorrect", n, "deduction.captured", `Línea ${n}: al sustituir aparece «${term}» bajo un cuantificador que lo captura.`, { rule, term });
      const eigenCheck = (variable: string, resultHolder: F, hyps: { formula: F; number: number }[], extra?: { conclusion: F }) => {
        if (quant.free(resultHolder).has(variable))
          return fail("incorrect", n, "deduction.eigenQuantified", `Línea ${n}: la variable «${variable}» ya aparece libre en la fórmula cuantificada.`, { rule, variable });
        if (extra && quant.free(extra.conclusion).has(variable))
          return fail("incorrect", n, "deduction.eigenConclusion", `Línea ${n}: la variable «${variable}» no puede aparecer libre en la conclusión de ∃E.`, { rule, variable });
        if (premises.some(p => quant.free(p).has(variable)))
          return fail("incorrect", n, "deduction.eigenPremise", `Línea ${n}: la variable «${variable}» aparece libre en una premisa.`, { rule, variable });
        const open = hyps.find(h => quant.free(h.formula).has(variable));
        if (open)
          return fail("incorrect", n, "deduction.eigenHypothesis", `Línea ${n}: la variable «${variable}» aparece libre en la hipótesis de la línea ${open.number}, aún abierta.`, { rule, variable, hypothesis: open.number });
        return undefined;
      };
      const hypsOf = (chain: number[]) => chain.map(id => ({ formula: lines[boxes[id].start].formula, number: lines[boxes[id].start].number }));
      const result = (m: InstanceMatch): ProofResult | undefined => {
        if (m.status === "capture") return captured(m.term);
        if (m.status === "none") return bad("el resultado no es una instancia de la fórmula citada");
        return undefined;
      };
      if (rule === "∀E") {
        const a = lineF(0);
        if (a === undefined) return kindError("una línea");
        const q = quant.view(a);
        if (!q || q.kind !== "forall") return bad("la línea citada debe empezar por ∀");
        return result(quant.instance(q.body, q.variable, f));
      }
      if (rule === "∃I") {
        const a = lineF(0);
        if (a === undefined) return kindError("una línea");
        const q = quant.view(f);
        if (!q || q.kind !== "exists") return bad("el resultado debe empezar por ∃");
        return result(quant.instance(q.body, q.variable, a));
      }
      if (rule === "∀I") {
        const a = lineF(0);
        if (a === undefined) return kindError("una línea");
        const q = quant.view(f);
        if (!q || q.kind !== "forall") return bad("el resultado debe empezar por ∀");
        const m = quant.instance(q.body, q.variable, a);
        if (m.status !== "ok") return result(m);
        if (m.vacuous) return undefined;
        if (!m.variable)
          return fail("incorrect", n, "deduction.notVariable", `Línea ${n}: ∀I generaliza una variable, no el término «${m.term}».`, { rule, term: m.term });
        const chain = lines[citations[0].from - 1].chain;
        return eigenCheck(m.variable, f, hypsOf(chain));
      }
      // ∃E
      if (lines2.length !== 1 || boxes2.length !== 1) return kindError("una línea ∃ y una subprueba");
      const q = quant.view(lines2[0]);
      if (!q || q.kind !== "exists") return bad("la línea citada debe empezar por ∃");
      const box = boxes2[0];
      const m = quant.instance(q.body, q.variable, box.hyp);
      if (m.status !== "ok") return result(m);
      if (!eq(box.end, f)) return bad("la subprueba debe terminar en el resultado");
      if (m.vacuous) return undefined;
      if (!m.variable)
        return fail("incorrect", n, "deduction.notVariable", `Línea ${n}: la hipótesis de ∃E debe usar una variable nueva, no el término «${m.term}».`, { rule, term: m.term });
      return eigenCheck(m.variable, lines2[0], hypsOf(cur.chain), { conclusion: f });
    }
  }
}

// ---------------------------------------------------------------- vista previa

export type PreviewLine = {
  number: number;
  depth: number;
  /** Fórmula normalizada, o undefined si no se puede leer. */
  formula?: string;
  formulaError?: DomainError;
  rule: ProofRule;
  citations: string;
};

/** Lectura línea a línea (sin comprobar reglas), para mostrar cómo se interpreta la demostración. */
export function previewProofWith<F>(
  sys: FormulaSystem<F>,
  text: string,
  atoms: string[],
): { lines: PreviewLine[]; error?: ProofResult } {
  const raw = splitLines(text);
  if (!Array.isArray(raw)) return { lines: [], error: raw };
  const lines: PreviewLine[] = [];
  for (const [i, l] of raw.entries()) {
    const one = parseProofLine(l, i + 1);
    if ("status" in one) return { lines, error: one };
    let formula: string | undefined;
    let formulaError: DomainError | undefined;
    try {
      formula = sys.format(sys.parse(one.formula, atoms));
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      formulaError = error;
    }
    lines.push({
      number: one.number,
      depth: one.depth,
      formula,
      formulaError,
      rule: one.rule,
      citations: one.citations.map(c => (c.from === c.to ? String(c.from) : `${c.from}-${c.to}`)).join(", "),
    });
  }
  return { lines };
}

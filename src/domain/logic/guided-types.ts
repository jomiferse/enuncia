/**
 * Contrato compartido del flujo guiado de resolución (change `guided-resolution-flow`).
 * Lo importan los motores de dominio (leyes, simplificación, árbol), el corrector `guided.ts`
 * y la interfaz. No contiene lógica.
 *
 * Fases (ver specs/guided-resolution): 1 forma normal (FNC/FNS), 2 simplificación del conjunto,
 * 3 árbol de resolución, 4 conclusión (válido), 5 consistencia de las premisas (fases 2-3 solo con premisas).
 */
import type { MessageCode, MessageParams } from "../errors";
import type { PredicateSignature } from "./predicates";

export type GuidedLanguage = "propositional" | "predicate";

/** Contexto para parsear fórmulas: átomos (enunciados) o signatura (predicados). */
export type FormulaContext =
  | { language: "propositional"; atoms: string[] }
  | { language: "predicate"; signature: PredicateSignature };

/** Datos de ejercicio (`exercise.data`) del tipo `resolution`. */
export type GuidedExerciseData = {
  language: GuidedLanguage;
  premises: string[];
  conclusion: string;
  /** enunciados */
  atoms?: string[];
  /** predicados (lecturas en lenguaje natural incluidas, como en deducción natural) */
  signature?: {
    predicates: { name: string; arity: number; reading?: string }[];
    constants: { name: string; reading?: string }[];
    variables?: string[];
  };
  /** predicados: dato revisado a mano (no decidible en general). En enunciados se calcula. */
  valid?: boolean;
  consistent?: boolean;
  /** solución de referencia completa (se valida con el propio corrector) */
  reference: GuidedAnswer;
};

/** Ids de ley. Terminales: "fnc" (enunciados) y "fns" (predicados). */
export type LawId =
  | "imp" | "deMorganAnd" | "deMorganOr" | "doubleNeg" | "distribOrAnd"
  | "idemAnd" | "idemOr" | "contradiction" | "tautology"
  | "neutralAnd" | "absorbOrTop" | "absorbAndBottom" | "neutralOr" | "absorbAnd" | "absorbOr"
  | "notForall" | "notExists" | "renameForall" | "renameExists" | "moveForall" | "skolem"
  | "fnc" | "fns";

/** Un paso de forma normal: ley aplicada y fórmula resultante (vacía en terminales). */
export type NormalFormStep = { law: LawId; result: string };

export type SimplifyKind = "subsumption" | "pure" | "tautology" | "repeated" | "none";
/** Un paso de simplificación: tipo y conjunto resultante (texto `{A, ¬B}, {C}`); vacío con "none". */
export type SimplifyStep = { kind: SimplifyKind; result: string };

/**
 * Un paso del árbol de resolución lineal. Las cláusulas disponibles se numeran desde 0:
 * primero las del conjunto de partida (ya simplificado), luego los resolventes en orden de creación.
 * Los literales se escriben como texto (`B`, `¬A`, `P(x)`). El resolvente lo calcula el sistema.
 */
export type TreeStep = { trunk: number; side: number; trunkLiteral: string; sideLiteral: string };

/** Fases 2-3 sobre un conjunto de cláusulas. */
export type ClausePhaseAnswer = {
  simplify: SimplifyStep[];
  /** ¿existe árbol de resolución? null = sin responder */
  possible: boolean | null;
  tree: TreeStep[];
};

/** Respuesta completa. Se serializa con JSON; el estado totalmente vacío se serializa como "". */
export type GuidedAnswer = {
  nf: { premises: NormalFormStep[][]; negConclusion: NormalFormStep[] };
  refute: ClausePhaseAnswer;
  /** conclusión sobre la validez; null = sin responder */
  valid: boolean | null;
  premisesPhase: ClausePhaseAnswer;
  /** conclusión sobre la consistencia; null = sin responder */
  consistent: boolean | null;
};

/** Resultado de un paso; `code`/`params` se traducen con `translateMessage` (claves `errors.<code>`). */
export type StepResult = {
  ok: boolean;
  code?: MessageCode;
  params?: MessageParams;
  /** texto canónico resultante (fórmula o conjunto de cláusulas) cuando el paso es correcto */
  resultText?: string;
};

export type TreeStepResult = StepResult & { resolvent?: string; substitution?: string };

export type ClausePhaseEvaluation = {
  /** conjunto de partida calculado por el sistema (cláusulas como texto) */
  startSet: string[];
  simplify: StepResult[];
  /** la simplificación está terminada y es correcta */
  simplified: boolean;
  /** conjunto tras simplificar (texto), base del árbol */
  finalSet: string[];
  possible: StepResult | null;
  tree: TreeStepResult[];
  /** cláusulas numeradas disponibles para elegir (conjunto final + resolventes) */
  available: string[];
  /** fase completa y correcta (incluida la respuesta "no es posible" si procede) */
  complete: boolean;
};

export type GuidedEvaluation = {
  nf: {
    /** una lista de resultados por premisa y otra para la negación de la conclusión */
    premises: StepResult[][];
    negConclusion: StepResult[];
    /** fórmulas de partida (canónicas) de cada premisa y de la negación de la conclusión */
    startFormulas: string[];
    complete: boolean;
  };
  /** null mientras la fase está bloqueada */
  refute: ClausePhaseEvaluation | null;
  valid: StepResult | null;
  premisesPhase: ClausePhaseEvaluation | null;
  consistent: StepResult | null;
  /** todo correcto */
  correct: boolean;
  /** el estado está completamente vacío (sin responder) */
  blank: boolean;
};

export const emptyClausePhase = (): ClausePhaseAnswer => ({ simplify: [], possible: null, tree: [] });
export const emptyGuidedAnswer = (premiseCount: number): GuidedAnswer => ({
  nf: { premises: Array.from({ length: premiseCount }, () => []), negConclusion: [] },
  refute: emptyClausePhase(),
  valid: null,
  premisesPhase: emptyClausePhase(),
  consistent: null,
});

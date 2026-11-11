import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  availableRules,
  deductionSystem,
  previewDeduction,
  readNaturalDeductionData,
  type NaturalDeductionData,
} from "../../../../domain/exercises/types/natural-deduction";
import type { ProofRule } from "../../../../domain/logic/deduction";
import { MAX_ANSWER_LENGTH } from "../../../../domain/logic/limits";
import { signatureVariables } from "../../../../domain/logic/predicates";
import type { Exercise } from "../../../../domain/models";
import { translateError, translateMessage } from "../../../i18n/messages";
import { ExerciseHeading } from "../ExerciseHeading";
import type { EditorProps, ExerciseTypeUi } from "../registry";

const ruleIds = {
  Premisa: "premise",
  Hipótesis: "hypothesis",
  Reiteración: "reiteration",
  "∧I": "andI",
  "∧E": "andE",
  "∨I": "orI",
  "∨E": "orE",
  "→I": "impI",
  "→E": "impE",
  "¬I": "notI",
  "¬E": "notE",
  "⊥E": "botE",
  RAA: "raa",
  "↔I": "iffI",
  "↔E": "iffE",
  "∀I": "allI",
  "∀E": "allE",
  "∃I": "exI",
  "∃E": "exE",
} as const satisfies Record<ProofRule, string>;

const formulaText = (data: NaturalDeductionData, f: string) => {
  const sys = deductionSystem(data);
  return sys.format(sys.parse(f, data.atoms));
};

function NaturalDeductionStatement({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const data = readNaturalDeductionData(exercise);
  const rules = data.rules ? availableRules(data) : undefined;
  return (
    <>
      <ExerciseHeading exercise={exercise} label={t("NaturalDeduction.label")} />
      <blockquote>{exercise.statement}</blockquote>
      <p className="input-help">{t("NaturalDeduction.goal")}</p>
      <div className="nd-sequent">
        <div className="nd-group">
          <span className="eyebrow">{t("NaturalDeduction.premises")}</span>
          {data.premises.length ? (
            <ol className="nd-premises">
              {data.premises.map((p, i) => (
                <li className="math" key={i}>{formulaText(data, p)}</li>
              ))}
            </ol>
          ) : (
            <p className="input-help">{t("NaturalDeduction.noPremises")}</p>
          )}
        </div>
        <div className="nd-group">
          <span className="eyebrow">{t("NaturalDeduction.conclusion")}</span>
          <div className="math nd-conclusion">{formulaText(data, data.conclusion)}</div>
        </div>
      </div>
      <p className="nd-rules">
        <span className="eyebrow">{t("NaturalDeduction.allowedRules")}</span>{" "}
        {rules ? rules.join("  ") : t("NaturalDeduction.allRules")}
      </p>
      <div className="atoms nd-dictionary">
        <span className="eyebrow">{t("NaturalDeduction.dictionary")}</span>
        <dl>
          {data.language === "propositional"
            ? data.atoms.map((a) => (
                <div key={a}>
                  <dt>{a}</dt>
                  <dd>{data.atomReadings[a]}</dd>
                </div>
              ))
            : [...data.predicates.map((p) => ({ name: p.name, arity: p.arity, reading: p.reading })), ...data.constants.map((c) => ({ ...c, arity: -1 }))].map((s) => (
                <div key={s.name}>
                  <dt>{s.arity > 0 ? `${s.name}(${signatureVariables(data.signature ?? { predicates: {}, constants: [] }).slice(0, s.arity).join(", ")})` : s.name}</dt>
                  <dd>{s.reading}</dd>
                </div>
              ))}
        </dl>
        {data.signature && (
          <p className="input-help">
            {t("NaturalDeduction.variablesNote", { variables: signatureVariables(data.signature).join(", ") })}
          </p>
        )}
      </div>
    </>
  );
}

function ProofLines({ lines }: { lines: ReturnType<typeof previewDeduction>["lines"] }) {
  const { t } = useTranslation();
  return (
    <div className="nd-proof" role="table">
      <div className="nd-proof-row nd-proof-head" role="row">
        <span role="columnheader">{t("NaturalDeduction.lineNumber")}</span>
        <span role="columnheader">{t("NaturalDeduction.formula")}</span>
        <span role="columnheader">{t("NaturalDeduction.rule")}</span>
        <span role="columnheader">{t("NaturalDeduction.citations")}</span>
      </div>
      {lines.map((line) => (
        <div className="nd-proof-row" role="row" key={line.number}>
          <span className="nd-num" role="cell">{line.number}</span>
          <span className="nd-formula" role="cell" style={{ "--depth": line.depth } as React.CSSProperties}>
            <span className="math">{line.formula ?? "?"}</span>
          </span>
          <span className="nd-rule" role="cell">{line.rule}</span>
          <span className="nd-cites" role="cell">{line.citations}</span>
        </div>
      ))}
    </div>
  );
}

function NaturalDeductionEditor({ exercise, value, onChange, preview = true }: EditorProps) {
  const { t } = useTranslation();
  const data = readNaturalDeductionData(exercise);
  const input = useRef<HTMLTextAreaElement>(null);
  const predicate = data.language === "predicate";
  const rules = availableRules(data);
  const names = predicate
    ? [...data.predicates.map((p) => p.name), ...data.constants.map((c) => c.name), ...signatureVariables(data.signature ?? { predicates: {}, constants: [] }).slice(0, 3)]
    : data.atoms;
  const symbols = ["¬", "∧", "∨", "→", "↔", "⊥", ...(predicate ? ["∀", "∃"] : []), "(", ")", ",", ";", ">"];

  const edit = (next: (start: number, end: number) => { text: string; caret: number } | undefined) => {
    const el = input.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const result = next(start, end);
    if (!result || result.text.length > MAX_ANSWER_LENGTH) return;
    onChange(result.text);
    requestAnimationFrame(() => {
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(result.caret, result.caret);
    });
  };
  const insert = (symbol: string) =>
    edit((start, end) => ({ text: value.slice(0, start) + symbol + value.slice(end), caret: start + symbol.length }));
  const erase = (all = false) =>
    edit((start, end) => {
      const from = all ? 0 : start === end ? Math.max(0, start - 1) : start;
      return { text: all ? "" : value.slice(0, from) + value.slice(end), caret: from };
    });
  const newLine = () =>
    edit(() => {
      const lines = value.split(/\r?\n/).filter((l) => l.trim());
      const last = lines.at(-1) ?? "";
      const depth = ((/^\s*((?:[>|│]\s*)*)\d+\s*[.)]\s*((?:[>|│]\s*)*)/.exec(last)?.slice(1, 3).join("") ?? "").match(/[>|│]/g) ?? []).length;
      const prefix = `${lines.length + 1}. ${"> ".repeat(depth)}`;
      const base = value.replace(/\s+$/, "");
      const text = `${base}${base ? "\n" : ""}${prefix}`;
      return { text, caret: text.length };
    });

  const parsed = preview && value.trim() ? previewDeduction(value, data) : undefined;
  const firstError = parsed?.lines.find((l) => l.formulaError);
  const syntaxError = parsed?.error;
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="formula-editor deduction-editor">
      <label htmlFor="deduction-input">{t("NaturalDeduction.yourProof")}</label>
      <div className="nd-bars">
        <div className="symbol-bar" role="group" aria-label={t("NaturalDeduction.symbols")}>
          {symbols.map((s) => (
            <button type="button" key={s} onMouseDown={keepFocus} onClick={() => insert(s)} aria-label={t("NaturalDeduction.insert", { value: s })}>
              {s}
            </button>
          ))}
          {names.map((s) => (
            <button type="button" key={s} className="atom-button" onMouseDown={keepFocus} onClick={() => insert(s)} aria-label={t("NaturalDeduction.insert", { value: s })}>
              {s}
            </button>
          ))}
        </div>
        <div className="symbol-bar nd-rule-bar" role="group" aria-label={t("NaturalDeduction.rules")}>
          {(["Premisa", "Hipótesis", ...rules] as ProofRule[]).map((r) => (
            <button type="button" key={r} title={t(`NaturalDeduction.ruleHelp.${ruleIds[r]}`)} onMouseDown={keepFocus} onClick={() => insert(r)} aria-label={t("NaturalDeduction.insert", { value: r })}>
              {r}
            </button>
          ))}
        </div>
        <div className="symbol-bar nd-action-bar">
          <button type="button" className="atom-button" onMouseDown={keepFocus} onClick={newLine} title={t("NaturalDeduction.newLineTitle")}>
            {t("NaturalDeduction.newLine")}
          </button>
          <button type="button" className="erase-button" disabled={!value} onMouseDown={keepFocus} onClick={() => erase()} title={t("NaturalDeduction.eraseTitle")}>
            {t("NaturalDeduction.erase")}
          </button>
          <button type="button" className="erase-button" disabled={!value} onMouseDown={keepFocus} onClick={() => erase(true)} title={t("NaturalDeduction.eraseAllTitle")}>
            {t("NaturalDeduction.eraseAll")}
          </button>
        </div>
      </div>
      <textarea
        id="deduction-input"
        className="deduction-input"
        ref={input}
        value={value}
        rows={10}
        maxLength={MAX_ANSWER_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("NaturalDeduction.placeholder")}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-describedby="deduction-help"
      />
      <p className="input-help" id="deduction-help">{t("NaturalDeduction.formatHelp")}</p>
      <details className="nd-reference">
        <summary>{t("NaturalDeduction.referenceTitle")}</summary>
        <ul>
          {(["Premisa", "Hipótesis", ...rules] as ProofRule[]).map((r) => (
            <li key={r}>{t(`NaturalDeduction.ruleHelp.${ruleIds[r]}`)}</li>
          ))}
        </ul>
        <p className="input-help">{t("NaturalDeduction.referenceFormat")}</p>
      </details>
      {preview && (
        <div className={`interpretation nd-preview ${syntaxError || firstError ? "syntax" : ""}`} aria-live="polite">
          <span>{syntaxError || firstError ? t("NaturalDeduction.previewSyntax") : t("NaturalDeduction.previewTitle")}</span>
          {!parsed && <div>{t("NaturalDeduction.previewEmpty")}</div>}
          {parsed && parsed.lines.length > 0 && <ProofLines lines={parsed.lines} />}
          {syntaxError && <div>{translateMessage(syntaxError.messageCode, syntaxError.messageParams)}</div>}
          {firstError?.formulaError && (
            <div>{t("NaturalDeduction.previewLineError", { line: firstError.number, error: translateError(firstError.formulaError) })}</div>
          )}
        </div>
      )}
    </div>
  );
}

function NaturalDeductionSolution({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const data = readNaturalDeductionData(exercise);
  const { lines } = previewDeduction(data.proof.join("\n"), data);
  return (
    <div className="solution nd-solution">
      <span className="eyebrow">{t("NaturalDeduction.solutionTitle")}</span>
      <ProofLines lines={lines} />
      <p className="input-help">{t("NaturalDeduction.solutionNote")}</p>
      <p>{exercise.explanation}</p>
    </div>
  );
}

export const naturalDeductionUi: ExerciseTypeUi = {
  Editor: NaturalDeductionEditor,
  Statement: NaturalDeductionStatement,
  Solution: NaturalDeductionSolution,
};

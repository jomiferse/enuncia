import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatFormula } from "../../../domain/logic/evaluation";
import { MAX_FORMULA_LENGTH } from "../../../domain/logic/limits";
import { parseFormula } from "../../../domain/logic/parser";
import type { Exercise } from "../../../domain/models";
import { translateError } from "../../i18n/messages";
export function FormulaEditor({
  exercise,
  value,
  onChange,
  preview = true,
}: {
  exercise: Exercise;
  value: string;
  onChange: (s: string) => void;
  preview?: boolean;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLTextAreaElement>(null);
  let parsed = "";
  let error = "";
  if (preview && value.trim()) {
    try {
      parsed = formatFormula(parseFormula(value, Object.keys(exercise.atoms)));
    } catch (e) {
      error = translateError(e);
    }
  }
  const insert = (symbol: string) => {
    const el = input.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const next = value.slice(0, start) + symbol + value.slice(end);
    if (next.length > MAX_FORMULA_LENGTH) return;
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  };
  const erase = (all = false) => {
    const el = input.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const from = all ? 0 : start === end ? Math.max(0, start - 1) : start;
    onChange(all ? "" : value.slice(0, from) + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(from, from);
    });
  };
  return (
    <div className="formula-editor">
      <label htmlFor="formula-input">{t("FormulaEditor.tuFormalizacion")}</label>
      <div className="symbol-bar">
        {[
          "¬",
          "∧",
          "∨",
          "→",
          "↔",
          "(",
          ")",
          ...Object.keys(exercise.atoms),
        ].map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => insert(s)}
            aria-label={t("FormulaEditor.insertarValue1", { value1: s })}
            className={
              Object.keys(exercise.atoms).includes(s) ? "atom-button" : ""
            }
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          className="erase-button"
          disabled={!value}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => erase()}
          title={t("FormulaEditor.borrarLaSeleccionOElSimboloAnterior")}
        >
          {t("FormulaEditor.borrar")}</button>
        <button
          type="button"
          className="erase-button"
          disabled={!value}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => erase(true)}
          title={t("FormulaEditor.vaciarLaFormula")}
        >
          {t("FormulaEditor.borrarTodo")}</button>
      </div>
      <textarea
        id="formula-input"
        ref={input}
        value={value}
        maxLength={MAX_FORMULA_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("FormulaEditor.escribeAquiTuFormula")}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-describedby="formula-help"
      />
      <p className="input-help" id="formula-help">
        {t("FormulaEditor.tambienPuedesEscribirNbspAmpNbspNbsp")}</p>
      {preview && (
        <div
          className={`interpretation ${error ? "syntax" : ""}`}
          aria-live="polite"
        >
          <span>
            {error ? t("FormulaEditor.revisaLaSintaxis") : t("FormulaEditor.asiInterpretamosTuFormula")}
          </span>
          <div>{error || parsed || t("FormulaEditor.tuFormulaApareceraAqui")}</div>
        </div>
      )}
    </div>
  );
}

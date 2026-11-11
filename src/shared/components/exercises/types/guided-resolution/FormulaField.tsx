import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";

const MAX_FORMULA_LENGTH = 1000;

/** Campo de texto con barra de símbolos; Enter confirma. */
export function FormulaField({
  label,
  help,
  value,
  onChange,
  symbols,
  names,
  onSubmit,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  symbols: string[];
  names: string[];
  onSubmit?: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const insert = (symbol: string) => {
    const el = input.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const text = value.slice(0, start) + symbol + value.slice(end);
    if (text.length > MAX_FORMULA_LENGTH) return;
    onChange(text);
    requestAnimationFrame(() => {
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  };
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();
  return (
    <div className="gr-field">
      <label htmlFor={id}>{label}</label>
      {help && <p className="gr-field-help">{help}</p>}
      <input
        id={id}
        ref={input}
        className="gr-input math"
        type="text"
        value={value}
        maxLength={MAX_FORMULA_LENGTH}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="symbol-bar" role="group" aria-label={t("GuidedResolution.symbols")}>
        {symbols.map(s => (
          <button type="button" key={s} onMouseDown={keepFocus} onClick={() => insert(s)} aria-label={t("GuidedResolution.insert", { value: s })}>
            {s}
          </button>
        ))}
        {names.map(s => (
          <button type="button" key={`n-${s}`} className="atom-button" onMouseDown={keepFocus} onClick={() => insert(s)} aria-label={t("GuidedResolution.insert", { value: s })}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

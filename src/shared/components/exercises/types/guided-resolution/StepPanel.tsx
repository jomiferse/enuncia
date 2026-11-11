import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { StepResult } from "../../../../../domain/logic/guided-types";
import { translateMessage } from "../../../../i18n/messages";

/** Botón redondo «+» que despliega el editor de un paso. */
export function AddStepButton({ onClick, expanded, controls }: { onClick: () => void; expanded: boolean; controls: string }) {
  const { t } = useTranslation();
  return (
    <button type="button" className="gr-add" aria-expanded={expanded} aria-controls={controls} aria-label={t("GuidedResolution.addStep")} title={t("GuidedResolution.addStep")} onClick={onClick}>
      +
    </button>
  );
}

/** Estado compacto bajo la acción de un paso: «Correcto» o el motivo del error. */
export function InlineStatus({ result }: { result?: StepResult | null }) {
  const { t } = useTranslation();
  if (!result) return null;
  return result.ok ? (
    <span className="gr-tag gr-tag-ok"><span aria-hidden="true">✓ </span>{t("GuidedResolution.correct")}</span>
  ) : (
    <span className="gr-tag gr-tag-error"><span aria-hidden="true">✕ </span>{translateMessage(result.code ?? "incorrectFormula", result.params)}</span>
  );
}

/** Opciones de acción en rejilla compacta (radios). */
export function ActionOptions<T extends string>({
  legend,
  options,
  value,
  onChange,
  label,
  math = false,
}: {
  legend: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  label: (option: T) => string;
  math?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="gr-options">
      <legend>{legend}</legend>
      <div className="gr-options-grid">
        {options.map(o => (
          <label key={o} className={`gr-option${value === o ? " selected" : ""}`}>
            <input type="radio" name={id} checked={value === o} onChange={() => onChange(o)} />
            <span className={math ? "gr-option-math" : undefined}>{label(o)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Editor desplegable de un paso: paso anterior, acción, expresión y Guardar / Cerrar. */
export function StepPanel({
  id,
  previous,
  onCopy,
  canSave,
  onSave,
  onClose,
  children,
}: {
  id: string;
  previous?: string;
  onCopy?: () => void;
  canSave: boolean;
  onSave: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = `${id}-title`;
  useEffect(() => {
    ref.current?.querySelector<HTMLInputElement>("input, select")?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  return (
    <div
      id={id}
      ref={ref}
      className="gr-panel"
      role="group"
      aria-labelledby={titleId}
      onKeyDown={e => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="gr-panel-head">
        <h5 id={titleId}>{t("GuidedResolution.editStep")}</h5>
        <button type="button" className="gr-panel-close" aria-label={t("GuidedResolution.close")} onClick={onClose}>×</button>
      </div>
      {previous !== undefined && (
        <div className="gr-panel-previous">
          <span className="gr-panel-label">{t("GuidedResolution.previousStep")}</span>
          <span className="math">{previous || "∅"}</span>
          {onCopy && (
            <button type="button" className="gr-link" onClick={onCopy}>{t("GuidedResolution.copyPaste")}</button>
          )}
        </div>
      )}
      {children}
      <p className="gr-actions">
        <button type="button" className="gr-primary" disabled={!canSave} onClick={onSave}>{t("GuidedResolution.save")}</button>
        <button type="button" className="gr-secondary" onClick={onClose}>{t("GuidedResolution.close")}</button>
      </p>
    </div>
  );
}

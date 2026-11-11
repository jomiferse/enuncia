import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LawId, NormalFormStep, StepResult } from "../../../../../domain/logic/guided-types";
import { isTerminalLaw, MAX_STEPS, PREDICATE_LAWS, PROPOSITIONAL_LAWS, type GuidedContext } from "./catalog";
import { FormulaField } from "./FormulaField";
import { ActionOptions, AddStepButton, InlineStatus, StepPanel } from "./StepPanel";

const SYMBOLS = ["¬", "∧", "∨", "→", "(", ")", "■", "□"];
const PREDICATE_SYMBOLS = [...SYMBOLS, "∀", "∃", ","];

/** Pasos de forma normal de una fórmula, con editor desplegable «+». */
export function NormalFormTable({
  ctx,
  title,
  start,
  steps,
  results,
  onChange,
}: {
  ctx: GuidedContext;
  title: string;
  start: string;
  steps: NormalFormStep[];
  results?: StepResult[];
  onChange: (steps: NormalFormStep[]) => void;
}) {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [law, setLaw] = useState<LawId | null>(null);
  const [text, setText] = useState("");
  const laws = ctx.predicate ? PREDICATE_LAWS : PROPOSITIONAL_LAWS;
  const terminal = steps.some(s => isTerminalLaw(s.law));
  const lastFormula = [...steps].reverse().find(s => !isTerminalLaw(s.law))?.result || start;
  const needsText = law !== null && !isTerminalLaw(law);
  const canSave = law !== null && steps.length < MAX_STEPS && (!needsText || text.trim().length > 0);
  const close = () => {
    setOpen(false);
    setLaw(null);
    setText("");
  };
  const save = () => {
    if (!law || !canSave) return;
    onChange([...steps, { law, result: isTerminalLaw(law) ? "" : text.trim() }]);
    close();
  };
  const editable = !ctx.readOnly && !terminal;
  const rows = [{ formula: start, law: null as LawId | null, result: undefined as StepResult | undefined }, ...steps.map((s, i) => ({
    formula: isTerminalLaw(s.law) ? "" : (ctx.readOnly || (ctx.showStatus && results?.[i]?.ok) ? results?.[i]?.resultText : undefined) ?? s.result,
    law: s.law,
    result: results?.[i],
  }))];
  const done = terminal && results?.length === steps.length && results.every(r => r.ok);
  return (
    <div className="gr-table-block">
      <h4 className="gr-table-title">
        <span>{title}:</span> <span className="math">{start}</span>
        {ctx.showStatus && done && <span className="gr-tag gr-tag-ok">✓ {t("GuidedResolution.correct")}</span>}
      </h4>
      <ol className="gr-steps">
        {rows.map((row, i) => (
          <li key={i} className="gr-step">
            <span className="gr-step-num">{i + 1}.</span>
            <span className="gr-step-main math">{row.formula}</span>
            <span className="gr-step-action">
              {row.law && <span className="gr-step-law">{t(`GuidedResolution.laws.${row.law}`)}</span>}
              {ctx.showStatus && row.law && <InlineStatus result={row.result} />}
            </span>
            {editable && i === rows.length - 1 && !open && (
              <AddStepButton expanded={open} controls={panelId} onClick={() => setOpen(true)} />
            )}
          </li>
        ))}
      </ol>
      {editable && open && (
        <StepPanel id={panelId} previous={lastFormula} onCopy={() => setText(lastFormula)} canSave={canSave} onSave={save} onClose={close}>
          <ActionOptions legend={t("GuidedResolution.action")} options={laws} value={law} onChange={setLaw} label={l => t(`GuidedResolution.laws.${l}`)} math />
          {needsText && (
            <FormulaField
              label={t("GuidedResolution.expression")}
              help={t("GuidedResolution.expressionHelp")}
              value={text}
              onChange={setText}
              symbols={ctx.predicate ? PREDICATE_SYMBOLS : SYMBOLS}
              names={ctx.names}
              onSubmit={save}
            />
          )}
        </StepPanel>
      )}
      {!ctx.readOnly && steps.length > 0 && (
        <button type="button" className="gr-link gr-remove" onClick={() => onChange(steps.slice(0, -1))}>
          {t("GuidedResolution.removeLast")}
        </button>
      )}
    </div>
  );
}

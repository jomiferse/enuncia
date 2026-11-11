import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ClausePhaseEvaluation, SimplifyKind, SimplifyStep, StepResult, TreeStep, TreeStepResult } from "../../../../../domain/logic/guided-types";
import { translateMessage } from "../../../../i18n/messages";
import { MAX_STEPS, SIMPLIFY_KINDS, splitLiterals, type GuidedContext } from "./catalog";
import { FormulaField } from "./FormulaField";
import { ActionOptions, AddStepButton, InlineStatus, StepPanel } from "./StepPanel";

const SET_SYMBOLS = ["{", "}", ",", "¬", "□"];
const PREDICATE_SET_SYMBOLS = [...SET_SYMBOLS, "(", ")"];

/** Pregunta de respuesta única (sí/no, válido/no válido…) con estado inmediato. */
export function Choice({
  ctx,
  legend,
  value,
  onChange,
  options,
  result,
}: {
  ctx: GuidedContext;
  legend: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  options: { value: boolean; label: string }[];
  result?: StepResult | null;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <fieldset className="gr-choice">
      <legend>{legend}</legend>
      <div className="gr-chips">
        {options.map(o => (
          <label key={String(o.value)} className={`gr-chip${value === o.value ? " selected" : ""}`}>
            <input type="radio" name={id} disabled={ctx.readOnly} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {ctx.showStatus && result && (
        <p className={result.ok ? "gr-ok" : "gr-error"} aria-live="polite">
          <StatusInline result={result} t={t} />
        </p>
      )}
    </fieldset>
  );
}

function StatusInline({ result, t }: { result: StepResult; t: ReturnType<typeof useTranslation>["t"] }) {
  return result.ok ? (
    <>
      <span aria-hidden="true">✓ </span>
      {t("GuidedResolution.correct")}
    </>
  ) : (
    <>
      <span aria-hidden="true">✕ </span>
      {translateMessage(result.code ?? "incorrectFormula", result.params)}
    </>
  );
}

const clausesText = (clauses: string[]) => clauses.join(", ");

/** Fase de simplificación del conjunto de cláusulas, con editor desplegable «+». */
export function SimplifyBlock({
  ctx,
  steps,
  evaluation,
  onChange,
}: {
  ctx: GuidedContext;
  steps: SimplifyStep[];
  evaluation?: ClausePhaseEvaluation | null;
  onChange: (steps: SimplifyStep[]) => void;
}) {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SimplifyKind | null>(null);
  const [text, setText] = useState("");
  const startSet = ctx.showStatus || ctx.readOnly ? clausesText(evaluation?.startSet ?? []) : "";
  const done = steps.some(s => s.kind === "none");
  const lastSet = [...steps].reverse().find(s => s.kind !== "none")?.result || startSet;
  const needsText = kind !== null && kind !== "none";
  const canSave = kind !== null && steps.length < MAX_STEPS && (!needsText || text.trim().length > 0);
  const close = () => {
    setOpen(false);
    setKind(null);
    setText("");
  };
  const save = () => {
    if (!kind || !canSave) return;
    onChange([...steps, { kind, result: kind === "none" ? "" : text.trim() }]);
    close();
  };
  const editable = !ctx.readOnly && !done;
  const wrap = (set: string) => set || "—";
  const rows = [
    { set: wrap(startSet), kind: null as SimplifyKind | null, result: undefined as StepResult | undefined },
    ...steps.map((step, i) => ({
      set: step.kind === "none" ? "" : wrap((ctx.readOnly || (ctx.showStatus && evaluation?.simplify[i]?.ok) ? evaluation?.simplify[i]?.resultText : undefined) ?? step.result),
      kind: step.kind,
      result: evaluation?.simplify[i],
    })),
  ];
  return (
    <div className="gr-table-block">
      <p className="gr-table-intro">{t("GuidedResolution.simplifyIntro")}</p>
      <ol className="gr-steps">
        {rows.map((row, i) => (
          <li key={i} className="gr-step">
            <span className="gr-step-num">{i + 1}.</span>
            <span className="gr-step-main math">{row.set}</span>
            <span className="gr-step-action">
              {row.kind && <span className="gr-step-law">{t(`GuidedResolution.kinds.${row.kind}`)}</span>}
              {ctx.showStatus && row.kind && <InlineStatus result={row.result} />}
            </span>
            {editable && i === rows.length - 1 && !open && <AddStepButton expanded={open} controls={panelId} onClick={() => setOpen(true)} />}
          </li>
        ))}
      </ol>
      {editable && open && (
        <StepPanel id={panelId} previous={lastSet} onCopy={() => setText(lastSet)} canSave={canSave} onSave={save} onClose={close}>
          <ActionOptions legend={t("GuidedResolution.action")} options={SIMPLIFY_KINDS} value={kind} onChange={setKind} label={k => t(`GuidedResolution.kinds.${k}`)} />
          {needsText && (
            <FormulaField
              label={t("GuidedResolution.expression")}
              help={t("GuidedResolution.resultSet")}
              value={text}
              onChange={setText}
              symbols={ctx.predicate ? PREDICATE_SET_SYMBOLS : SET_SYMBOLS}
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

type Draft = { trunk: string; side: string; trunkLiteral: string; sideLiteral: string };
const emptyDraft: Draft = { trunk: "", side: "", trunkLiteral: "", sideLiteral: "" };

/** Una cláusula y su literal: select si hay cláusulas disponibles, entrada libre si no. */
function ClausePicker({
  label,
  literalLabel,
  available,
  index,
  literal,
  onIndex,
  onLiteral,
}: {
  label: string;
  literalLabel: string;
  available: string[];
  index: string;
  literal: string;
  onIndex: (value: string) => void;
  onLiteral: (value: string) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const free = available.length === 0;
  const literals = !free && index !== "" ? splitLiterals(available[Number(index)] ?? "") : [];
  return (
    <div className="gr-picker">
      <label htmlFor={`${id}-c`}>{label}</label>
      {free ? (
        <input id={`${id}-c`} type="number" min={1} max={99} inputMode="numeric" value={index === "" ? "" : Number(index) + 1} onChange={e => onIndex(e.target.value === "" ? "" : String(Math.max(0, Number(e.target.value) - 1)))} />
      ) : (
        <select id={`${id}-c`} value={index} onChange={e => onIndex(e.target.value)}>
          <option value="">{t("GuidedResolution.choose")}</option>
          {available.map((c, i) => (
            <option key={i} value={String(i)}>{`${i + 1}. ${c}`}</option>
          ))}
        </select>
      )}
      <label htmlFor={`${id}-l`}>{literalLabel}</label>
      {free ? (
        <input id={`${id}-l`} className="math" type="text" value={literal} maxLength={200} spellCheck={false} autoComplete="off" onChange={e => onLiteral(e.target.value)} />
      ) : (
        <select id={`${id}-l`} className="math" value={literal} disabled={index === ""} onChange={e => onLiteral(e.target.value)}>
          <option value="">{t("GuidedResolution.choose")}</option>
          {literals.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/** Árbol de resolución lineal: tabla troncal / lateral / acción y editor desplegable «+». */
export function TreeBlock({
  ctx,
  steps,
  evaluation,
  onChange,
}: {
  ctx: GuidedContext;
  steps: TreeStep[];
  evaluation?: ClausePhaseEvaluation | null;
  onChange: (steps: TreeStep[]) => void;
}) {
  const { t } = useTranslation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const available = ctx.showStatus || ctx.readOnly ? (evaluation?.available ?? []) : [];
  const results: TreeStepResult[] = evaluation?.tree ?? [];
  const closed = results.some(r => r.resolvent === "□");
  const label = (index: number) => (available[index] !== undefined ? `${index + 1}. ${available[index]}` : String(index + 1));
  const lastResolvent = available.length > 0 && steps.length > 0 ? String(available.length - 1) : "";
  const trunkValue = draft.trunk !== "" ? draft.trunk : lastResolvent;
  const canSave = trunkValue !== "" && draft.side !== "" && draft.trunkLiteral.trim() !== "" && draft.sideLiteral.trim() !== "" && steps.length < MAX_STEPS;
  const close = () => {
    setOpen(false);
    setDraft(emptyDraft);
  };
  const save = () => {
    if (!canSave) return;
    onChange([...steps, { trunk: Number(trunkValue), side: Number(draft.side), trunkLiteral: draft.trunkLiteral.trim(), sideLiteral: draft.sideLiteral.trim() }]);
    close();
  };
  const editable = !ctx.readOnly && !closed;
  const showResolvent = ctx.showStatus || ctx.readOnly;
  return (
    <div className="gr-table-block">
      {available.length > 0 && (
        <div className="gr-available">
          <span className="gr-panel-label">{t("GuidedResolution.availableClauses")}</span>
          <ol className="math">
            {available.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </div>
      )}
      <div className="gr-scroll">
        <table className="gr-table">
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">{t("GuidedResolution.step")}</span></th>
              <th scope="col">{t("GuidedResolution.trunk")}</th>
              <th scope="col">{t("GuidedResolution.side")}</th>
              <th scope="col">{t("GuidedResolution.action")}</th>
              {showResolvent && <th scope="col">{t("GuidedResolution.resolvent")}</th>}
            </tr>
          </thead>
          <tbody>
            {steps.map((step, i) => {
              const r = results[i];
              return (
                <tr key={i}>
                  <td className="gr-num">{i + 1}.</td>
                  <td className="math" data-label={t("GuidedResolution.trunk")}>
                    {label(step.trunk)} <span className="gr-literal">{step.trunkLiteral}</span>
                  </td>
                  <td className="math" data-label={t("GuidedResolution.side")}>
                    {label(step.side)} <span className="gr-literal">{step.sideLiteral}</span>
                  </td>
                  <td data-label={t("GuidedResolution.action")}>
                    <span className="gr-step-law">{t("GuidedResolution.resolution")}</span>
                    {ctx.showStatus && <InlineStatus result={r} />}
                  </td>
                  {showResolvent && (
                    <td className="math" data-label={t("GuidedResolution.resolvent")}>
                      {r?.resolvent ?? "—"}
                      {r?.substitution ? <div className="gr-substitution">{t("GuidedResolution.substitution", { value: r.substitution })}</div> : null}
                    </td>
                  )}
                </tr>
              );
            })}
            {editable && !open && (
              <tr>
                <td className="gr-num">{steps.length + 1}.</td>
                <td colSpan={showResolvent ? 4 : 3}>
                  <AddStepButton expanded={open} controls={panelId} onClick={() => setOpen(true)} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {closed && <p className="gr-tag gr-tag-ok gr-closed"><span aria-hidden="true">✓ </span>{t("GuidedResolution.emptyReached")}</p>}
      {editable && open && (
        <StepPanel id={panelId} canSave={canSave} onSave={save} onClose={close}>
          <div className="gr-pickers">
            <ClausePicker
              label={t("GuidedResolution.trunkClause")}
              literalLabel={t("GuidedResolution.trunkLiteral")}
              available={available}
              index={trunkValue}
              literal={draft.trunkLiteral}
              onIndex={v => setDraft({ ...draft, trunk: v, trunkLiteral: "" })}
              onLiteral={v => setDraft({ ...draft, trunk: trunkValue, trunkLiteral: v })}
            />
            <ClausePicker
              label={t("GuidedResolution.sideClause")}
              literalLabel={t("GuidedResolution.sideLiteral")}
              available={available}
              index={draft.side}
              literal={draft.sideLiteral}
              onIndex={v => setDraft({ ...draft, side: v, sideLiteral: "" })}
              onLiteral={v => setDraft({ ...draft, sideLiteral: v })}
            />
          </div>
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

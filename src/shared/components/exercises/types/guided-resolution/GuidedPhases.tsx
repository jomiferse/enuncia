import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ClausePhaseAnswer, ClausePhaseEvaluation, GuidedAnswer, GuidedEvaluation } from "../../../../../domain/logic/guided-types";
import { normalizeFormula, type GuidedContext } from "./catalog";
import { Choice, SimplifyBlock, TreeBlock } from "./ClauseBlocks";
import { NormalFormTable } from "./NormalFormTable";

type PhaseState = "locked" | "complete" | "open" | "plain";

function PhaseCard({ title, state, children }: { title: string; state: PhaseState; children: ReactNode }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <section className={`gr-phase gr-phase-${state}`} aria-labelledby={id} aria-disabled={state === "locked" || undefined}>
      <header className="gr-phase-head">
        <h3 id={id}>{title}</h3>
        {state !== "plain" && <span className={`gr-badge gr-badge-${state}`}>{t(`GuidedResolution.state.${state}`)}</span>}
      </header>
      {state === "locked" ? <p className="input-help gr-locked">{t("GuidedResolution.lockedHelp")}</p> : children}
    </section>
  );
}

type PhaseProps = {
  ctx: GuidedContext;
  answer: ClausePhaseAnswer;
  evaluation?: ClausePhaseEvaluation | null;
  onChange: (next: ClausePhaseAnswer) => void;
  /** el árbol aún no se puede abordar */
  treeLocked: boolean;
};

function TreeSection({ ctx, answer, evaluation, onChange, treeLocked }: PhaseProps) {
  const { t } = useTranslation();
  const yesNo = [
    { value: true, label: t("GuidedResolution.yes") },
    { value: false, label: t("GuidedResolution.no") },
  ];
  const state: PhaseState = !ctx.showStatus ? "plain" : treeLocked ? "locked" : evaluation?.complete ? "complete" : "open";
  return (
    <PhaseCard title={t("GuidedResolution.phases.tree")} state={state}>
      <Choice
        ctx={ctx}
        legend={t("GuidedResolution.possibleQuestion")}
        value={answer.possible}
        onChange={possible => onChange({ ...answer, possible })}
        options={yesNo}
        result={evaluation?.possible}
      />
      {answer.possible === true && (
        <TreeBlock ctx={ctx} steps={answer.tree} evaluation={evaluation} onChange={tree => onChange({ ...answer, tree })} />
      )}
    </PhaseCard>
  );
}

/** Todas las fases del ejercicio guiado; sirve de editor (con `onAnswer`) y de solución (solo lectura). */
export function GuidedPhases({
  ctx,
  answer,
  evaluation,
  onAnswer,
}: {
  ctx: GuidedContext;
  answer: GuidedAnswer;
  evaluation: GuidedEvaluation | null;
  onAnswer: (next: GuidedAnswer) => void;
}) {
  const { t } = useTranslation();
  const { data } = ctx;
  const lock = ctx.lockPhases;
  const nfStarts = (i: number) => evaluation?.nf.startFormulas[i] ?? normalizeFormula(data.premises[i] ?? "");
  const negStart = evaluation?.nf.startFormulas[data.premises.length] ?? `¬(${normalizeFormula(data.conclusion)})`;
  const withPremise = (i: number, steps: GuidedAnswer["nf"]["premises"][number]) =>
    onAnswer({ ...answer, nf: { ...answer.nf, premises: answer.nf.premises.map((s, j) => (j === i ? steps : s)) } });

  const status = (done: boolean | undefined, locked: boolean): PhaseState => (!ctx.showStatus ? "plain" : locked ? "locked" : done ? "complete" : "open");
  const refute = evaluation?.refute;
  const premisesEv = evaluation?.premisesPhase;
  const yesNoValid = [
    { value: true, label: t("GuidedResolution.valid") },
    { value: false, label: t("GuidedResolution.notValid") },
  ];
  const yesNoConsistent = [
    { value: true, label: t("GuidedResolution.consistent") },
    { value: false, label: t("GuidedResolution.inconsistent") },
  ];

  return (
    <div className="gr-phases">
      <PhaseCard title={t(ctx.predicate ? "GuidedResolution.phases.nfPredicate" : "GuidedResolution.phases.nfPropositional")} state={status(evaluation?.nf.complete, false)}>
        <p className="input-help">{t(ctx.predicate ? "GuidedResolution.nfHelpPredicate" : "GuidedResolution.nfHelpPropositional")}</p>
        {data.premises.map((_, i) => (
          <NormalFormTable
            key={i}
            ctx={ctx}
            title={t("GuidedResolution.premiseN", { n: i + 1 })}
            start={nfStarts(i)}
            steps={answer.nf.premises[i] ?? []}
            results={evaluation?.nf.premises[i]}
            onChange={steps => withPremise(i, steps)}
          />
        ))}
        <NormalFormTable
          ctx={ctx}
          title={t("GuidedResolution.negConclusion")}
          start={negStart}
          steps={answer.nf.negConclusion}
          results={evaluation?.nf.negConclusion}
          onChange={negConclusion => onAnswer({ ...answer, nf: { ...answer.nf, negConclusion } })}
        />
      </PhaseCard>

      <PhaseCard title={t("GuidedResolution.phases.set")} state={status(refute?.simplified, lock && !refute)}>
        <SimplifyBlock ctx={ctx} steps={answer.refute.simplify} evaluation={refute} onChange={simplify => onAnswer({ ...answer, refute: { ...answer.refute, simplify } })} />
      </PhaseCard>

      <TreeSection ctx={ctx} answer={answer.refute} evaluation={refute} treeLocked={lock && !refute?.simplified} onChange={refuteNext => onAnswer({ ...answer, refute: refuteNext })} />

      <PhaseCard title={t("GuidedResolution.phases.conclusion")} state={status(evaluation?.valid?.ok, lock && !refute?.complete)}>
        <Choice ctx={ctx} legend={t("GuidedResolution.validQuestion")} value={answer.valid} onChange={valid => onAnswer({ ...answer, valid })} options={yesNoValid} result={evaluation?.valid} />
      </PhaseCard>

      <PhaseCard title={t("GuidedResolution.phases.consistency")} state={status(evaluation?.consistent?.ok, lock && !premisesEv)}>
        <p className="input-help">{t("GuidedResolution.consistencyHelp")}</p>
        <h4 className="gr-table-title">{t("GuidedResolution.phases.set")}</h4>
        <SimplifyBlock ctx={ctx} steps={answer.premisesPhase.simplify} evaluation={premisesEv} onChange={simplify => onAnswer({ ...answer, premisesPhase: { ...answer.premisesPhase, simplify } })} />
        <TreeSection ctx={ctx} answer={answer.premisesPhase} evaluation={premisesEv} treeLocked={lock && !premisesEv?.simplified} onChange={next => onAnswer({ ...answer, premisesPhase: next })} />
        {lock && !premisesEv?.complete ? (
          <p className="input-help gr-locked">{t("GuidedResolution.lockedHelp")}</p>
        ) : (
          <Choice ctx={ctx} legend={t("GuidedResolution.consistentQuestion")} value={answer.consistent} onChange={consistent => onAnswer({ ...answer, consistent })} options={yesNoConsistent} result={evaluation?.consistent} />
        )}
      </PhaseCard>
    </div>
  );
}

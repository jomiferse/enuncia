import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { evaluateGuided, parseGuidedAnswer, serializeGuidedAnswer } from "../../../../domain/logic/guided";
import type { GuidedAnswer, GuidedEvaluation, GuidedExerciseData } from "../../../../domain/logic/guided-types";
import type { Exercise } from "../../../../domain/models";
import { ExerciseHeading } from "../ExerciseHeading";
import type { EditorProps, ExerciseTypeUi } from "../registry";
import { atomEntries, isBlankAnswer, makeContext, normalizeAnswer, normalizeFormula, readGuidedData, signatureEntries } from "./guided-resolution/catalog";
import { GuidedPhases } from "./guided-resolution/GuidedPhases";

function safeEvaluate(answer: GuidedAnswer | null, data: GuidedExerciseData): GuidedEvaluation | null {
  try {
    return evaluateGuided(answer, data);
  } catch {
    return null;
  }
}

function Dictionary({ data }: { data: GuidedExerciseData }) {
  const { t } = useTranslation();
  if (data.language === "propositional")
    return (
      <div className="atoms gr-dictionary">
        <span className="eyebrow">{t("GuidedResolution.atoms")}</span>
        <dl>
          {atomEntries(data).map(a => (
            <div key={a.name}>
              <dt>{a.name}</dt>
              <dd>{a.reading ?? ""}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  const sig = signatureEntries(data);
  const symbols = [
    ...sig.predicates.map(p => ({ key: p.name, term: p.arity && p.arity > 0 ? `${p.name}(${sig.variables.slice(0, p.arity).join(", ")})` : p.name, reading: p.reading })),
    ...sig.constants.map(c => ({ key: c.name, term: c.name, reading: c.reading })),
  ];
  return (
    <div className="atoms gr-dictionary">
      <span className="eyebrow">{t("GuidedResolution.dictionary")}</span>
      <dl>
        {symbols.map(s => (
          <div key={s.key}>
            <dt>{s.term}</dt>
            <dd>{s.reading ?? ""}</dd>
          </div>
        ))}
      </dl>
      <p className="input-help">{t("GuidedResolution.variablesNote", { variables: sig.variables.join(", ") })}</p>
    </div>
  );
}

function GuidedStatement({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const data = readGuidedData(exercise);
  return (
    <>
      <ExerciseHeading exercise={exercise} label={t("GuidedResolution.label")} />
      {exercise.statement && <blockquote>{exercise.statement}</blockquote>}
      <p className="input-help">{t("GuidedResolution.goal")}</p>
      <div className="nd-sequent gr-sequent">
        <div className="nd-group">
          <span className="eyebrow">{t("GuidedResolution.premises")}</span>
          {data.premises.length ? (
            <ol className="nd-premises">
              {data.premises.map((p, i) => (
                <li className="math" key={i}>{normalizeFormula(p)}</li>
              ))}
            </ol>
          ) : (
            <p className="input-help">{t("GuidedResolution.noPremises")}</p>
          )}
        </div>
        <div className="nd-group">
          <span className="eyebrow">{t("GuidedResolution.conclusion")}</span>
          <div className="math nd-conclusion">{normalizeFormula(data.conclusion)}</div>
        </div>
      </div>
      <Dictionary data={data} />
    </>
  );
}

function GuidedEditor({ exercise, value, onChange, preview }: EditorProps) {
  const { t } = useTranslation();
  const data = readGuidedData(exercise);
  const parsed = useMemo(() => parseGuidedAnswer(value), [value]);
  const answer = useMemo(() => normalizeAnswer(parsed, data.premises.length), [parsed, data.premises.length]);
  const evaluation = useMemo(() => safeEvaluate(parsed ? answer : null, data), [parsed, answer, data]);
  const ctx = useMemo(() => makeContext(data, { preview: preview !== false }), [data, preview]);
  const update = (next: GuidedAnswer) => onChange(isBlankAnswer(next) ? "" : serializeGuidedAnswer(next));
  return (
    <div className="gr-editor">
      <p className="input-help">{t(ctx.showStatus ? "GuidedResolution.editorHelp" : "GuidedResolution.editorHelpExam")}</p>
      <GuidedPhases ctx={ctx} answer={answer} evaluation={evaluation} onAnswer={update} />
    </div>
  );
}

function GuidedSolution({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const data = readGuidedData(exercise);
  const answer = useMemo(() => normalizeAnswer(data.reference ?? null, data.premises.length), [data]);
  const evaluation = useMemo(() => safeEvaluate(answer, data), [answer, data]);
  const ctx = useMemo(() => makeContext(data, { preview: true, readOnly: true }), [data]);
  return (
    <div className="solution gr-solution">
      <span className="eyebrow">{t("GuidedResolution.solutionTitle")}</span>
      <GuidedPhases ctx={ctx} answer={answer} evaluation={evaluation} onAnswer={() => undefined} />
      <p className="input-help">{t("GuidedResolution.solutionNote")}</p>
      <p>{exercise.explanation}</p>
    </div>
  );
}

export const guidedResolutionUi: ExerciseTypeUi = {
  Editor: GuidedEditor,
  Statement: GuidedStatement,
  Solution: GuidedSolution,
};

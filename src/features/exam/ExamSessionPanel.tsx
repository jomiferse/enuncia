import { ArrowLeft, ArrowRight, Clock3, Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { exerciseById } from "../../data/catalog";
import { Statement } from "../../shared/components/exercises/Statement";
import { editorRegistry } from "../../shared/components/exercises/registry";
import { elapsedLabel } from "../../shared/utils/format";
import { FinishExamDialog } from "./FinishExamDialog";
import type { ExamSession } from "./useExam";
export function ExamSessionPanel({ exam }: { exam: ExamSession }) {
  const { t } = useTranslation();
  const { active, examIndex, setExamIndex, now, updateAnswer, confirmFinish, setConfirmFinish, finishExam } = exam;
  if (!active) return null;

  const e = exerciseById[active.exerciseIds[examIndex]];
  const Editor = editorRegistry[e.type].Editor;
  const answered = active.exerciseIds.filter((id) =>
    active.answers[id]?.trim(),
  ).length;
  return (
    <>
      <div className="exam-toolbar">
        <div>
          <span className="eyebrow">{t("ExamSessionPanel.simulacroEnCurso")}</span>
          <h1>{t("ExamSessionPanel.concentrateEnLaCondicion")}</h1>
        </div>
        <div className="timer">
          <Clock3 size={19} />
          {elapsedLabel(now - active.startedAt)}
          <small>{t("ExamSessionPanel.sinLimite")}</small>
        </div>
      </div>
      <div className="exam-navigation">
        {active.exerciseIds.map((id, i) => (
          <button
            key={id}
            aria-label={t("ExamSessionPanel.ejercicioValue1Value2", { value1: i + 1, value2: active.answers[id]?.trim() ? t("ExamSessionPanel.conRespuesta") : "" })}
            aria-current={i === examIndex ? "step" : undefined}
            className={`${i === examIndex ? "current" : ""} ${active.answers[id]?.trim() ? "answered" : ""}`}
            onClick={() => setExamIndex(i)}
          >
            {i + 1}
          </button>
        ))}
        <span>{answered} {t("ExamSessionPanel.de10Respondidos")}</span>
      </div>
      <article className="exercise-card exam-exercise">
        <Statement exercise={e} />
        <Editor
          exercise={e}
          value={active.answers[e.id] ?? ""}
          onChange={(answer) =>
            updateAnswer(e.id, answer)
          }
          preview={false}
        />
        <div className="exercise-actions between">
          <button
            className="button secondary"
            disabled={examIndex === 0}
            onClick={() => setExamIndex(examIndex - 1)}
          >
            <ArrowLeft size={16} />
            {t("ExamSessionPanel.anterior")}</button>
          {examIndex < 9 ? (
            <button
              className="button primary"
              onClick={() => setExamIndex(examIndex + 1)}
            >
              {t("ExamSessionPanel.siguiente")}<ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="button primary"
              onClick={() => setConfirmFinish(true)}
            >
              <Flag size={16} />
              {t("ExamSessionPanel.entregarSimulacro")}</button>
          )}
        </div>
        <p className="input-help">
          {t("ExamSessionPanel.tusRespuestasSeGuardanPuedesCambiarDe")}</p>
      </article>
      <button
        className="text-button finish-link"
        onClick={() => setConfirmFinish(true)}
      >
        {t("ExamSessionPanel.entregarYVerResultados")}<ArrowRight size={16} />
      </button>
      {confirmFinish && <FinishExamDialog answered={answered}
        onCancel={() => setConfirmFinish(false)} onConfirm={finishExam} />}
    </>
  );
}

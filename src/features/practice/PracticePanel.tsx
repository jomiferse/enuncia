import { ArrowRight, Check, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { exerciseTypes } from "../../domain/exercises/registry";
import type { Grade } from "../../domain/logic/grading";
import type { Attempt, Exercise, PracticeDraft } from "../../domain/models";
import { Feedback } from "../../shared/components/exercises/Feedback";
import { Solution } from "../../shared/components/exercises/Solution";
import { Statement } from "../../shared/components/exercises/Statement";
import { editorRegistry } from "../../shared/components/exercises/registry";
export function PracticePanel({
  exercise,
  draft,
  onDraft,
  onAttempt,
  onNext,
}: {
  exercise: Exercise;
  draft: PracticeDraft;
  onDraft: (d: PracticeDraft) => void;
  onAttempt: (a: Attempt) => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const [result, setResult] = useState<Grade | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!result) return;
    feedbackRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, [result]);
  const Editor = editorRegistry[exercise.type].Editor;
  const check = () => {
    const r = exerciseTypes[exercise.type].grade(
      draft.answer,
      exercise.solution,
      Object.keys(exercise.atoms),
    );
    setResult(r);
    onAttempt({
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      answer: draft.answer,
      status: r.status,
      aided: draft.hints > 0 || draft.revealed,
      timestamp: Date.now(),
      mode: "practice",
    });
  };
  const reveal = () => {
    onDraft({ ...draft, revealed: true });
    onAttempt({
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      answer: draft.answer,
      status: "revealed",
      aided: true,
      timestamp: Date.now(),
      mode: "practice",
    });
  };
  return (
    <article className="exercise-card">
      <Statement exercise={exercise} />
      <Editor
        exercise={exercise}
        value={draft.answer}
        onChange={(answer) => {
          onDraft({ ...draft, answer });
          setResult(null);
        }}
      />
      <div className="exercise-actions">
        <button className="button primary" onClick={check}>
          <Check size={18} />
          {t("PracticePanel.comprobar")}</button>
        <button
          className="button secondary"
          disabled={draft.hints === 2}
          onClick={() => onDraft({ ...draft, hints: draft.hints + 1 })}
        >
          <Lightbulb size={17} />
          {draft.hints === 2
            ? t("PracticePanel.pistasConsultadas")
            : t("PracticePanel.pistaValue1De2", { value1: draft.hints + 1 })}
        </button>
      </div>
      {draft.hints > 0 && (
        <div className="hints" aria-live="polite">
          {exercise.hints.slice(0, draft.hints).map((h, i) => (
            <p key={h}>
              <b>{t("PracticePanel.pista")}{i + 1}.</b> {h}
            </p>
          ))}
        </div>
      )}
      {result && (
        <div ref={feedbackRef} className="practice-feedback">
          <Feedback result={result} exercise={exercise} />
        </div>
      )}
      <div className="practice-bottom">
        {!draft.revealed && result?.status !== "correct" ? (
          <button className="text-button" onClick={reveal}>
            {t("PracticePanel.verSolucionExplicada")}</button>
        ) : (
          <span className="input-help">
            {draft.hints || draft.revealed
              ? t("PracticePanel.intentoConAyudaRegistrada")
              : t("PracticePanel.siguePracticandoATuRitmo")}
          </span>
        )}
        <button className="text-button" onClick={onNext}>
          {t("PracticePanel.siguienteEjercicio")}<ArrowRight size={16} />
        </button>
      </div>
      {draft.revealed && result?.status !== "correct" && (
        <Solution exercise={exercise} />
      )}
    </article>
  );
}

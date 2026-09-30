import { ChevronRight, GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Exam, Progress } from "../../domain/models";
import { dateLabel, elapsedLabel } from "../../shared/utils/format";
export function ExamHistory({ progress, onReview }: { progress: Progress; onReview: (exam: Exam) => void }) {
  const { t } = useTranslation();
  return (
    <section className="panel history">
      <h2>{t("ExamHistory.simulacrosTerminados")}</h2>
      {progress.exams.length ? (
        [...progress.exams].reverse().map((exam) => {
          const attempts = progress.attempts.filter(
            (a) => a.examId === exam.id,
          );
          const correct = attempts.filter(
            (a) => a.status === "correct",
          ).length;
          return (
            <button
              className="history-row"
              key={exam.id}
              onClick={() => {
                onReview(exam);
              }}
            >
              <GraduationCap size={20} />
              <span>
                <strong>{correct} {t("ExamHistory.10Aciertos")}</strong>
                <small>
                  {dateLabel(exam.finishedAt ?? exam.startedAt)} ·{" "}
                  {elapsedLabel(
                    (exam.finishedAt ?? exam.startedAt) - exam.startedAt,
                  )}
                </small>
              </span>
              <span className="text-button">
                {t("ExamHistory.revisar")}<ChevronRight size={16} />
              </span>
            </button>
          );
        })
      ) : (
        <p className="muted">{t("ExamHistory.aunNoHasTerminadoUnSimulacro")}</p>
      )}
    </section>
  );
}

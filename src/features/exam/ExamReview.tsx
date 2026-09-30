import { ArrowRight, Check, ChevronRight, Clock3, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { exerciseById } from "../../data/catalog";
import { examResults } from "../../domain/exam/grading";
import type { Exam } from "../../domain/models";
import { Badge } from "../../shared/components/Badge";
import { PageIntro } from "../../shared/components/PageIntro";
import { Feedback } from "../../shared/components/exercises/Feedback";
import { Solution } from "../../shared/components/exercises/Solution";
import { Statement } from "../../shared/components/exercises/Statement";
import { dateLabel, elapsedLabel } from "../../shared/utils/format";
export function ExamReview({ exam, onNew }: { exam: Exam; onNew: () => void }) {
  const { t } = useTranslation();
  const results = examResults(exam, exerciseById);
  const correct = results.filter((r) => r.result?.status === "correct").length;
  return (
    <>
      <PageIntro
        eyebrow="SIMULACRO TERMINADO"
        title={t("ExamReview.cadaIntentoTeEnsenaAlgo")}
        text={t("ExamReview.revisaLasCondicionesQueTeHicieronDudar")}
      />
      <section className="exam-score">
        <div>
          <span className="eyebrow">{t("ExamReview.tuResultado")}</span>
          <strong>
            {correct}
            <small> / 10</small>
          </strong>
          <p>
            {correct === 10
              ? t("ExamReview.todasLasFormulasSonCorrectasBuenTrabajo")
              : t("ExamReview.value1EjerciciosParaRevisarConCalma", { value1: 10 - correct })}
          </p>
        </div>
        <div>
          <p>
            <Clock3 size={17} />
            {elapsedLabel(
              (exam.finishedAt ?? Date.now()) - exam.startedAt,
            )} · {dateLabel(exam.finishedAt ?? exam.startedAt)}
          </p>
          <button className="button primary" onClick={onNew}>
            {t("ExamReview.prepararOtroSimulacro")}<ArrowRight size={17} />
          </button>
        </div>
      </section>
      <div className="exam-results">
        {results.map(({ id, exercise, result }, i) =>
          exercise && result ? (
            <details className="result-details" key={id}>
              <summary>
                <span className={`history-status ${result.status}`}>
                  {result.status === "correct" ? (
                    <Check size={17} />
                  ) : (
                    <RotateCcw size={17} />
                  )}
                </span>
                <span>
                  {i + 1}. {exercise.title}
                </span>
                <Badge difficulty={exercise.difficulty} />
                <ChevronRight size={17} />
              </summary>
              <div className="result-body">
                <Statement exercise={exercise} />
                <span className="eyebrow">{t("ExamReview.tuRespuesta")}</span>
                <div className="math submitted-answer">
                  {result.interpreted || exam.answers[id] || t("ExamReview.sinRespuesta")}
                </div>
                <Feedback
                  result={result}
                  exercise={exercise}
                  showSolution={false}
                />
                <Solution exercise={exercise} />
              </div>
            </details>
          ) : (
            <div className="panel" key={id}>
              {t("ExamReview.elEjercicio")}{id} {t("ExamReview.yaNoEstaEnElBancoLa")}{exam.answers[id] || t("ExamReview.sinRespuesta")}.
            </div>
          ),
        )}
      </div>
    </>
  );
}

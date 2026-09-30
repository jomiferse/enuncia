import { ArrowLeft, ArrowRight, Check, ChevronRight, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Attempt } from "../../domain/models";
import { exerciseStats } from "../../domain/progress/statistics";
import { useDifficultyLabels } from "../../shared/i18n/useDifficultyLabels";
import type { PracticeNavigation } from "./usePracticeNavigation";
type ExerciseListProps = {
  attempts: Attempt[];
  practice: Pick<PracticeNavigation, "filtered" | "pagination" | "selectedExercise" | "setSelected" | "setPracticePage">;
};
export function ExerciseList({ attempts, practice }: ExerciseListProps) {
  const difficultyLabels = useDifficultyLabels();
  const { t } = useTranslation();
  const { filtered, pagination, selectedExercise, setSelected, setPracticePage } = practice;
  return (
    <aside className="exercise-list">
      <div className="list-heading">
        {t("common.exercises", { count: filtered.length })}{" "}
        <span>
          {t("ExerciseList.pagina")}{pagination.page + 1} / {pagination.count}
        </span>
      </div>
      {pagination.items.map((e) => {
        const s = exerciseStats(e.id, attempts);
        return (
          <button
            key={e.id}
            className={`exercise-item ${selectedExercise?.id === e.id ? "selected" : ""}`}
            onClick={() => setSelected(e.id)}
          >
            <span
              className={`exercise-number ${s.pending ? "pending" : s.solved ? "done" : ""}`}
            >
              {s.pending ? (
                <RotateCcw size={15} />
              ) : s.solved ? (
                <Check size={16} />
              ) : (
                e.id.split("-").at(-1)
              )}
            </span>
            <span>
              <strong>{e.title}</strong>
              <small>
                {difficultyLabels[e.difficulty]} ·{" "}
                {s.pending
                  ? t("ExerciseList.paraRepasar")
                  : s.solved
                    ? "Completado"
                    : s.attempts
                      ? t("ExerciseList.enPractica")
                      : t("ExerciseList.sinIntentar")}
              </small>
            </span>
            <ChevronRight size={15} />
          </button>
        );
      })}
      {!filtered.length && (
        <p className="empty-mini">
          {t("ExerciseList.noHayEjerciciosConEstosFiltros")}</p>
      )}
      {pagination.count > 1 && (
        <nav
          className="exercise-pagination"
          aria-label={t("ExerciseList.paginasDeEjercicios")}
        >
          <button
            aria-label={t("ExerciseList.paginaAnterior")}
            disabled={pagination.page === 0}
            onClick={() => setPracticePage(pagination.page - 1)}
          >
            <ArrowLeft size={16} />
          </button>
          <span>
            {pagination.page + 1} / {pagination.count}
          </span>
          <button
            aria-label={t("ExerciseList.paginaSiguiente")}
            disabled={pagination.page === pagination.count - 1}
            onClick={() => setPracticePage(pagination.page + 1)}
          >
            <ArrowRight size={16} />
          </button>
        </nav>
      )}
    </aside>
  );
}

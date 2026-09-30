import {
  ArrowLeft,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { summarizeExercises } from "../../domain/course/queries";
import type { Attempt, Block, Difficulty, Exercise } from "../../domain/models";
import { useDifficultyLabels } from "../../shared/i18n/useDifficultyLabels";
import { ProgressRows } from "./ProgressRows";
export function LevelChooser({
  block,
  pool,
  attempts,
  errorsOnly,
  onBack,
  onLevel,
}: {
  block: Block;
  pool: Exercise[];
  attempts: Attempt[];
  errorsOnly: boolean;
  onBack: () => void;
  onLevel: (difficulty: Difficulty) => void;
}) {
  const difficultyLabels = useDifficultyLabels();
  const { t } = useTranslation();
  return (
    <>
      <button className="text-button course-back" onClick={onBack}>
        <ArrowLeft size={16} />
        {t("LevelChooser.todosLosBloques")}</button>
      <div className="course-section-heading">
        <div>
          <span className="eyebrow">{block.title.toLocaleUpperCase("es")}</span>
          <h2>{block.subtitle}</h2>
          <p>{t("LevelChooser.eligeUnNivelParaPracticarEnGrupos")}</p>
        </div>
      </div>
      {errorsOnly && (
        <p className="review-context">
          <RotateCcw size={16} />
          {t("LevelChooser.soloSeMostraranLosErroresPendientesDel")}</p>
      )}
      <div className="level-grid">
        {(["basica", "media", "avanzada"] as Difficulty[]).map(
          (difficulty, index) => {
            const own = pool.filter((e) => e.difficulty === difficulty);
            const stats = summarizeExercises(own, attempts);
            const disabled =
              own.length === 0 || (errorsOnly && stats.pending === 0);
            return (
              <article className="course-card level-card" key={difficulty}>
                <span className="eyebrow">
                  {t("LevelChooser.nivel")}{String(index + 1).padStart(2, "0")}
                </span>
                <h3>{difficultyLabels[difficulty]}</h3>
                <p>
                  {
                    [
                      t("LevelChooser.empiezaPorLasConectivasYLasCondiciones"),
                      t("LevelChooser.distingueRequisitosExcepcionesYElAlcanceDe"),
                      t("LevelChooser.conectaReglasYResuelveCondicionesAnidadas"),
                    ][index]
                  }
                </p>
                <div className="course-count-heading">
                  <span>{t("LevelChooser.ejercicios")}</span>
                  <b>{own.length}</b>
                </div>
                <ProgressRows pool={own} attempts={attempts} />
                <div className="course-review-count">
                  <RotateCcw size={13} />
                  {stats.pending} {t("LevelChooser.paraRepasar")}</div>
                <button
                  className="button primary wide"
                  onClick={() => onLevel(difficulty)}
                  disabled={disabled}
                  aria-label={t("LevelChooser.practicarNivelValue1", { value1: difficultyLabels[difficulty].toLowerCase() })}
                >
                  {errorsOnly ? t("LevelChooser.repasarEsteNivel") : t("LevelChooser.practicarEsteNivel")}
                  <ArrowRight size={16} />
                </button>
              </article>
            );
          },
        )}
      </div>
    </>
  );
}

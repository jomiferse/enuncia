import {
  ArrowRight,
  BookOpen,
  Layers,
  RotateCcw
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { summarizeExercises } from "../../domain/course/queries";
import type { Area, Attempt, Block, Exercise } from "../../domain/models";
import { AreaTabs } from "./AreaTabs";
import { ProgressRows } from "./ProgressRows";
export function CourseBrowser({
  areas,
  blocks,
  exercises,
  attempts,
  areaId,
  errorsOnly,
  onArea,
  onBlock,
}: {
  areas: Area[];
  blocks: Block[];
  exercises: Exercise[];
  attempts: Attempt[];
  areaId: string;
  errorsOnly: boolean;
  onArea: (id: string) => void;
  onBlock: (id: string) => void;
}) {
  const { t } = useTranslation();
  const area = areas.find((a) => a.id === areaId)!;
  return (
    <>
      <AreaTabs areas={areas} selected={areaId} onSelect={onArea} />
      <div className="course-section-heading">
        <div>
          <span className="eyebrow">{t("CourseBrowser.eligeUnBloque")}</span>
          <h2>{area.title}</h2>
          <p>{area.description}</p>
        </div>
        <span className="course-section-note">
          <Layers size={16} />
          {t("common.blocks", { count: blocks.filter((b) => b.areaId === areaId).length })}</span>
      </div>
      {errorsOnly && (
        <p className="review-context">
          <RotateCcw size={16} />
          {t("CourseBrowser.estasRepasandoErroresEligeUnBloqueCon")}</p>
      )}
      <div className="course-grid">
        {blocks
          .filter((b) => b.areaId === areaId)
          .map((block) => {
            const pool = exercises.filter((e) => e.blockId === block.id);
            const stats = summarizeExercises(pool, attempts);
            const enabled =
              stats.total > 0 && (!errorsOnly || stats.pending > 0);
            return (
              <article
                className={`course-card ${!stats.total ? "planned" : ""}`}
                key={block.id}
              >
                <div className="course-card-top">
                  <span className="course-card-icon">
                    <BookOpen size={22} />
                  </span>
                  <span
                    className={`status-pill ${!stats.total ? "planned-pill" : ""}`}
                  >
                    {stats.total ? t("CourseBrowser.disponible") : t("CourseBrowser.proximamente")}
                  </span>
                </div>
                <h3>{block.subtitle}</h3>
                <p>{block.description}</p>
                <div className="course-count-heading">
                  <span>{t("CourseBrowser.ejerciciosDelBloque")}</span>
                  <b>{stats.total}</b>
                </div>
                <ProgressRows pool={pool} attempts={attempts} />
                {stats.total > 0 ? (
                  <div className="course-review-count">
                    <RotateCcw size={13} />
                    {stats.pending} {t("CourseBrowser.paraRepasar")}</div>
                ) : (
                  <div className="course-review-count">
                    {t("CourseBrowser.esteBloqueSeAmpliaraMasAdelante")}</div>
                )}
                <button
                  className={`button ${enabled ? "primary" : "secondary"} wide`}
                  disabled={!enabled}
                  onClick={() => onBlock(block.id)}
                  aria-label={
                    stats.total
                      ? t("CourseBrowser.value1Value2", { value1: errorsOnly ? t("CourseBrowser.repasar") : t("CourseBrowser.verEjerciciosDe"), value2: block.subtitle })
                      : t("CourseBrowser.value1Proximamente", { value1: block.subtitle })
                  }
                >
                  {!stats.total
                    ? t("CourseBrowser.proximamente2")
                    : errorsOnly
                      ? t("CourseBrowser.repasarErrores")
                      : t("CourseBrowser.verEjercicios")}
                  {enabled && <ArrowRight size={16} />}
                </button>
              </article>
            );
          })}
      </div>
    </>
  );
}

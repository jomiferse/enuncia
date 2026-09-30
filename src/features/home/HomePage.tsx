import { ArrowRight, BookOpen, ChevronRight, Clock3, GraduationCap, Lightbulb, RotateCcw, ShieldCheck, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { areas, blocks, exerciseById, exercises } from "../../data/catalog";
import { summarizeExercises } from "../../domain/course/queries";
import type { Progress } from "../../domain/models";
import { exerciseStats, summarizeProgress } from "../../domain/progress/statistics";
import { Metric } from "../../shared/components/Metric";
type HomePageProps = {
  progress: Progress;
  openPractice: (id?: string) => void;
  onArea: (id: string) => void;
  onExam: () => void;
  onGuide: () => void;
};
export function HomePage({ progress, openPractice, onArea, onExam, onGuide }: HomePageProps) {
  const { t } = useTranslation();
  const { complete, first, errors } = summarizeProgress(exercises, progress.attempts);
  const lastPracticed = [...progress.attempts]
    .reverse()
    .find((a) => exerciseById[a.exerciseId]);
  const continueId =
    lastPracticed?.exerciseId ??
    exercises.find((e) => !exerciseStats(e.id, progress.attempts).solved)?.id ??
    exercises[0].id;
  const active = progress.activeExam;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-label">
            <span />
            {t("HomePage.tuSiguientePasoMasClaro")}</div>
          <h1>
            {t("HomePage.delLenguaje")}<br />{t("HomePage.aLa")}<em>{t("HomePage.logica")}</em>
          </h1>
          <p>
            {t("HomePage.entrenaLaFormalizacionEntiendeCadaCondicion")}<br className="desktop-break" /> {t("HomePage.yLlegaAlExamenConConfianza")}</p>
          <button
            className="button primary"
            onClick={() =>
              openPractice(lastPracticed ? continueId : undefined)
            }
          >
            {" "}
            {lastPracticed ? t("HomePage.continuarPracticando") : t("HomePage.empezarAPracticar")}
            <ArrowRight size={18} />
          </button>
          <div className="hero-foot">
            <ShieldCheck size={15} /> {t("HomePage.tuProgresoSeGuardaEnEsteNavegador")}</div>
        </div>
        <div className="logic-art" aria-hidden="true">
          <div className="art-grid" />
          <div className="art-top">{t("HomePage.unEnunciadoUnaEstructura")}</div>
          <div className="art-phrase">
            {t("HomePage.siempreQueEstudio")}<br />
            {t("HomePage.aprendoAlgoNuevo")}</div>
          <div className="art-line" />
          <div className="art-atoms">
            <span>
              P <small>{t("HomePage.estudio")}</small>
            </span>
            <span>
              Q <small>{t("HomePage.aprendo")}</small>
            </span>
          </div>
          <div className="art-formula">
            P <span>→</span> Q
          </div>
          <div className="art-note">
            <i /> {t("HomePage.condicionSuficiente")}</div>
          <div className="art-decoration">∴</div>
        </div>
      </section>
      <section className="metrics" aria-label={t("HomePage.resumenDelProgreso")}>
        <Metric
          icon={<BookOpen size={20} />}
          value={`${complete} / ${exercises.length}`}
          label={t("HomePage.ejerciciosCompletados")}
        />
        <Metric
          icon={<Target size={20} />}
          value={String(first)}
          label={t("HomePage.aciertosInicialesSinAyuda")}
        />
        <Metric
          icon={<RotateCcw size={20} />}
          value={String(errors)}
          label={t("HomePage.erroresParaRepasar")}
        />
        <Metric
          icon={<GraduationCap size={20} />}
          value={String(progress.exams.length)}
          label={t("HomePage.simulacrosTerminados")}
        />
      </section>
      <div className="section-title">
        <div>
          <span className="eyebrow">{t("HomePage.pasoAPaso")}</span>
          <h2>{t("HomePage.tuRutaDeAprendizaje")}</h2>
        </div>
        <span className="muted">
          {areas.length} {t("HomePage.areasParaSeguirAprendiendo")}</span>
      </div>
      <section className="learning-grid area-overview-grid">
        {areas.map((area, index) => {
          const areaBlocks = blocks.filter((b) => b.areaId === area.id);
          const pool = exercises.filter((e) =>
            areaBlocks.some((b) => b.id === e.blockId),
          );
          const stats = summarizeExercises(pool, progress.attempts);
          const percentage = pool.length
            ? Math.round((stats.complete / pool.length) * 100)
            : 0;
          return (
            <article className="block-card" key={area.id}>
              <div className="block-top">
                <div className="block-icon">{area.symbol}</div>
                <span
                  className={`status-pill ${!pool.length ? "planned-pill" : ""}`}
                >
                  {pool.length ? t("HomePage.disponible") : t("HomePage.enPreparacion")}
                </span>
              </div>
              <span className="eyebrow">
                {t("HomePage.area")}{String(index + 1).padStart(2, "0")}
              </span>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
              <div className="block-tags">
                <span>{t("common.blocks", { count: areaBlocks.length })}</span>
                <span>{t("common.exercises", { count: pool.length })}</span>
              </div>
              <div className="progress-label">
                <span>{t("HomePage.tuAvance")}</span>
                <b>{percentage}%</b>
              </div>
              <div className="progress-track">
                <i style={{ width: `${percentage}%` }} />
              </div>
              <button
                className="button primary wide"
                aria-label={t("HomePage.explorarValue1", { value1: area.title })}
                onClick={() => {
                  onArea(area.id);
                }}
              >
                {t("HomePage.explorarBloques")}<ArrowRight size={17} />
              </button>
            </article>
          );
        })}
        <article className="exam-card">
          <div className="circle-icon">
            <GraduationCap size={27} />
          </div>
          <span className="eyebrow">{t("HomePage.ponteAPrueba")}</span>
          <h3>
            {t("HomePage.unEnsayoAntes")}<br />
            {t("HomePage.delExamen")}</h3>
          <p>
            {t("HomePage.10EjerciciosSinPistas")}<br />
            {t("HomePage.laCorreccionTeEsperaAlFinal")}</p>
          <button
            className="button secondary"
            onClick={() => {
              onExam();
            }}
          >
            {active ? t("HomePage.retomarSimulacro") : t("HomePage.prepararSimulacro")}
            <ArrowRight size={17} />
          </button>
          <div className="exam-card-foot">
            <Clock3 size={15} /> {t("HomePage.aTuRitmoSinLimiteDeTiempo")}</div>
        </article>
      </section>
      <section className="tip-banner">
        <Lightbulb size={23} />
        <div>
          <strong>{t("HomePage.noMemoricesLaFlechaEntiendeLaCondicion")}</strong>
          <p>
            {t("HomePage.pSoloSiQSignificaQueQ")}</p>
        </div>
        <button className="text-button" onClick={() => onGuide()}>
          {t("HomePage.verGuia")}<ChevronRight size={17} />
        </button>
      </section>
    </>
  );
}

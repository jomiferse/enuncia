import { ArrowRight, BookOpen, CheckCircle2, RotateCcw, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { exercises } from "../../data/catalog";
import type { Difficulty, Exam } from "../../domain/models";
import { exerciseStats, summarizeProgress } from "../../domain/progress/statistics";
import { Badge } from "../../shared/components/Badge";
import { Metric } from "../../shared/components/Metric";
import { PageIntro } from "../../shared/components/PageIntro";
import { AttemptHistory } from "./AttemptHistory";
import { ExamHistory } from "./ExamHistory";
import { ProgressBackup } from "./ProgressBackup";
import type { ProgressSession } from "./useProgress";
type ProgressPageProps = Pick<ProgressSession, "progress" | "exportData" | "importData"> & {
  openPractice: (id?: string, errorsOnly?: boolean) => void;
  onReview: (exam: Exam) => void;
};
export function ProgressPage({ progress, exportData, importData, openPractice, onReview }: ProgressPageProps) {
  const { t } = useTranslation();
  const { complete, first, errors } = summarizeProgress(exercises, progress.attempts);
  return (
    <>
      <PageIntro
        eyebrow="LO QUE YA HAS APRENDIDO"
        title={t("ProgressPage.tuConstanciaEnPerspectiva")}
        text={t("ProgressPage.consultaTusIntentosRecuperaLasDudasY")}
      />
      <section className="metrics">
        <Metric
          icon={<BookOpen size={20} />}
          value={`${complete} / ${exercises.length}`}
          label={t("ProgressPage.completadosAlgunaVez")}
        />
        <Metric
          icon={<Target size={20} />}
          value={String(first)}
          label={t("ProgressPage.primerAciertoSinAyuda")}
        />
        <Metric
          icon={<RotateCcw size={20} />}
          value={String(errors)}
          label={t("ProgressPage.pendientesDeRepaso")}
        />
        <Metric
          icon={<CheckCircle2 size={20} />}
          value={String(progress.attempts.length)}
          label={t("ProgressPage.registrosEnTuHistorial")}
        />
      </section>
      <section className="progress-columns">
        <article className="panel">
          <h2>{t("ProgressPage.porNivel")}</h2>
          {(["basica", "media", "avanzada"] as Difficulty[]).map((d) => {
            const own = exercises.filter((e) => e.difficulty === d);
            const solved = own.filter(
              (e) => exerciseStats(e.id, progress.attempts).solved,
            ).length;
            return (
              <div className="level-progress" key={d}>
                <div>
                  <Badge difficulty={d} />
                  <b>
                    {solved} / {own.length}
                  </b>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${(solved / own.length) * 100}%` }} />
                </div>
              </div>
            );
          })}
          <button
            className="text-button"
            onClick={() => openPractice(undefined, true)}
          >
            {t("ProgressPage.repasarErrores")}<ArrowRight size={16} />
          </button>
        </article>
        <ProgressBackup exportData={exportData} importData={importData} />
      </section>
      <ExamHistory progress={progress} onReview={onReview} />
      <AttemptHistory progress={progress} />
    </>
  );
}

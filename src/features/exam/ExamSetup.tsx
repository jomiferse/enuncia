import { ArrowRight, Clock3, FileText, GraduationCap, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Difficulty } from "../../domain/models";
import { PageIntro } from "../../shared/components/PageIntro";
import { useDifficultyLabels } from "../../shared/i18n/useDifficultyLabels";
import type { ExamSession } from "./useExam";
export function ExamSetup({ exam }: { exam: Pick<ExamSession, "examDifficulty" | "setExamDifficulty" | "startExam"> }) {
  const difficultyLabels = useDifficultyLabels();
  const { t } = useTranslation();
  const { examDifficulty, setExamDifficulty, startExam } = exam;
  return (
    <>
      <PageIntro
        eyebrow={t("ExamSetup.sinPistasATuRitmo")}
        title={t("ExamSetup.practicaComoSiFueraElExamen")}
        text={t("ExamSetup.diezEjerciciosDistintosPrimeroTusRespuestasDespues")}
      />
      <div className="exam-setup">
        <div className="circle-icon">
          <GraduationCap size={32} />
        </div>
        <h2>{t("ExamSetup.tuProximoSimulacro")}</h2>
        <div className="setup-facts">
          <span>
            <FileText size={18} />
            {t("ExamSetup.10Ejercicios")}</span>
          <span>
            <Clock3 size={18} />
            {t("ExamSetup.sinLimiteDeTiempo")}</span>
          <span>
            <ShieldCheck size={18} />
            {t("ExamSetup.guardadoAutomatico")}</span>
        </div>
        <label htmlFor="exam-level">{t("ExamSetup.dificultad")}</label>
        <select
          id="exam-level"
          value={examDifficulty}
          onChange={(e) =>
            setExamDifficulty(e.target.value as Difficulty | "all")
          }
        >
          <option value="all">
            {t("ExamSetup.equilibrado3Basicos4Medios3Avanzados")}</option>
          {Object.entries(difficultyLabels).map(([id, label]) => (
            <option value={id} key={id}>
              {t("ExamSetup.soloNivel")}{label.toLowerCase()}
            </option>
          ))}
        </select>
        <p>
          {t("ExamSetup.sinPistasNiCorreccionesMientrasRespondesCada")}</p>
        <button className="button primary" onClick={startExam}>
          {t("ExamSetup.empezarSimulacro")}<ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}

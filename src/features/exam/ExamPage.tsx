import { useTranslation } from "react-i18next";
import { Empty } from "../../shared/components/Empty";
import { ExamReview } from "./ExamReview";
import { ExamSessionPanel } from "./ExamSessionPanel";
import { ExamSetup } from "./ExamSetup";
import type { ExamSession } from "./useExam";

export function ExamPage({ exam }: { exam: ExamSession }) {
  const { t } = useTranslation();
  if (exam.reviewExam) {
    return <ExamReview exam={exam.reviewExam} onNew={() => exam.setReviewExam(null)} />;
  }
  if (exam.active && !exam.activeKnown) {
    return <Empty title={t("ExamPage.faltanEjerciciosDeEsteSimulacro")}
      text={t("ExamPage.restauraLosArchivosDelBancoParaRetomarlo")}
      action={exam.closeExam} actionLabel={t("ExamPage.cerrarSimulacroSinCalificar")} />;
  }
  return exam.active ? <ExamSessionPanel exam={exam} /> : <ExamSetup exam={exam} />;
}

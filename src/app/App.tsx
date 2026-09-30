import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExamPage } from "../features/exam/ExamPage";
import { useExam } from "../features/exam/useExam";
import { GuidePage } from "../features/guide/GuidePage";
import { HomePage } from "../features/home/HomePage";
import { PracticePage } from "../features/practice/PracticePage";
import { usePracticeNavigation } from "../features/practice/usePracticeNavigation";
import { ProgressPage } from "../features/progress/ProgressPage";
import { useProgress } from "../features/progress/useProgress";
import { AppLayout } from "./components/AppLayout";
import type { View } from "./navigation";
export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<View>("home");
  const session = useProgress();
  const exam = useExam(session.progress, session.setProgress);
  const go = (target: View) => {
    setView(target);
    session.setNotice("");
    exam.setConfirmFinish(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    );
  };
  // Keep feature state mounted when navigating so unfinished work can be resumed.
  const practice = usePracticeNavigation(session.progress, () => go("practice"));
  const openExam = () => { exam.setReviewExam(null); go("exam"); };
  const navigate = (target: View) => {
    if (target === "practice") practice.openPractice();
    else if (target === "exam") openExam();
    else go(target);
  };
  const titles: Record<View, string> = {
    home: t("App.tuEspacioDeEstudio"),
    practice: practice.practiceStage === "blocks"
      ? t("App.areasYBloques") : (practice.selectedBlock?.subtitle ?? t("App.practica")),
    exam: t("App.simulacroDeExamen"),
    progress: t("App.tuProgreso"),
    guide: t("App.guiaDePractica"),
  };
  return (
    <AppLayout view={view} title={titles[view]}
      hasActiveExam={Boolean(exam.active)} storageError={session.storageError}
      notice={session.notice} onNavigate={navigate}
      onDismissNotice={() => session.setNotice("")}>
      {view === "home" && <HomePage progress={session.progress}
        openPractice={practice.openPractice}
        onArea={id => { practice.setOnlyErrors(false); practice.openArea(id); }}
        onExam={openExam} onGuide={() => go("guide")} />}
      {view === "practice" && <PracticePage practice={practice}
        progress={session.progress} saveDraft={session.saveDraft}
        recordAttempt={session.recordAttempt} />}
      {view === "exam" && <ExamPage exam={exam} />}
      {view === "progress" && <ProgressPage progress={session.progress}
        exportData={session.exportData} importData={session.importData}
        openPractice={practice.openPractice}
        onReview={review => { exam.setReviewExam(review); go("exam"); }} />}
      {view === "guide" && <GuidePage />}
    </AppLayout>
  );
}

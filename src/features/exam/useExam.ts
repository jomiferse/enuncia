import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { exerciseById, exercises } from "../../data/catalog";
import { completeExam } from "../../domain/exam/grading";
import { selectExam } from "../../domain/exam/selection";
import { exerciseTypes } from "../../domain/exercises/registry";
import type { Difficulty, Exam, Progress } from "../../domain/models";
export function useExam(progress: Progress, setProgress: Dispatch<SetStateAction<Progress>>) {
  const [examDifficulty, setExamDifficulty] = useState<Difficulty | "all">(
    "all",
  );
  const [examIndex, setExamIndex] = useState(0);
  const [reviewExam, setReviewExam] = useState<Exam | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!progress.activeExam) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [progress.activeExam?.id]);
  const startExam = () => {
    const available = exercises.filter((e) => e.type in exerciseTypes);
    const exam: Exam = {
      id: crypto.randomUUID(),
      exerciseIds: selectExam(available, examDifficulty),
      answers: {},
      startedAt: Date.now(),
    };
    setProgress((p) => ({ ...p, activeExam: exam }));
    setReviewExam(null);
    setExamIndex(0);
    setNow(Date.now());
  };
  const finishExam = () => {
    const exam = progress.activeExam;
    if (!exam) return;
    const { finished, attempts } = completeExam(exam, exerciseById, Date.now(), () => crypto.randomUUID());
    setProgress((p) => ({
      ...p,
      activeExam: null,
      exams: [...p.exams, finished],
      attempts: [...p.attempts, ...attempts],
    }));
    setReviewExam(finished);
    setConfirmFinish(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const active = progress.activeExam;
  const activeKnown = active?.exerciseIds.every((id) =>
    Boolean(exerciseById[id]),
  );
  const updateAnswer = (exerciseId: string, answer: string) => {
    setProgress(p => ({
      ...p, activeExam: p.activeExam ? {
        ...p.activeExam, answers: { ...p.activeExam.answers, [exerciseId]: answer }
      } : null
    }));
  };
  const closeExam = () => setProgress(p => ({ ...p, activeExam: null }));
  return { examDifficulty, setExamDifficulty, examIndex, setExamIndex, reviewExam, setReviewExam, confirmFinish, setConfirmFinish, now, active, activeKnown, startExam, finishExam, updateAnswer, closeExam };
}
export type ExamSession = ReturnType<typeof useExam>;

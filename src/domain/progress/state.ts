import type { Attempt, PracticeDraft, Progress } from "../models";
export const emptyProgress = (): Progress => ({
  version: 1,
  drafts: {},
  attempts: [],
  exams: [],
  activeExam: null,
});
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  const attempts = [
    ...new Map(
      [...incoming.attempts, ...current.attempts].map((a) => [a.id, a]),
    ).values(),
  ].sort((a, b) => a.timestamp - b.timestamp);
  const exams = [
    ...new Map(
      [...incoming.exams, ...current.exams].map((e) => [e.id, e]),
    ).values(),
  ].sort((a, b) => a.startedAt - b.startedAt);
  const activeExam = current.activeExam ?? incoming.activeExam;
  return {
    version: 1,
    drafts: { ...incoming.drafts, ...current.drafts },
    attempts,
    exams,
    activeExam:
      activeExam && exams.some((e) => e.id === activeExam.id)
        ? null
        : activeExam,
  };
}

export function savePracticeDraft(progress: Progress, exerciseId: string, draft: PracticeDraft): Progress {
  return { ...progress, drafts: { ...progress.drafts, [exerciseId]: draft } };
}
export function appendAttempt(progress: Progress, attempt: Attempt): Progress {
  return { ...progress, attempts: [...progress.attempts, attempt] };
}

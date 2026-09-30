export type Difficulty = "basica" | "media" | "avanzada";
export type Exercise = {
  id: string;
  blockId: string;
  type: string;
  difficulty: Difficulty;
  title: string;
  tags: string[];
  statement: string;
  atoms: Record<string, string>;
  solution: string;
  hints: [string, string];
  explanation: string;
};
export type Attempt = {
  id: string;
  exerciseId: string;
  answer: string;
  status: "correct" | "incorrect" | "invalid" | "revealed";
  aided: boolean;
  timestamp: number;
  mode: "practice" | "exam";
  examId?: string;
};
export type Exam = {
  id: string;
  exerciseIds: string[];
  answers: Record<string, string>;
  startedAt: number;
  finishedAt?: number;
};
export type PracticeDraft = {
  answer: string;
  hints: number;
  revealed: boolean;
};
export type Progress = {
  version: 1;
  drafts: Record<string, PracticeDraft>;
  attempts: Attempt[];
  exams: Exam[];
  activeExam: Exam | null;
};
export type Block = {
  id: string;
  title: string;
  subtitle: string;
  type: string;
};

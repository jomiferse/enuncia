import { DomainError } from "../errors";
import { exerciseTypes } from "../exercises/registry";
import type { Attempt, Exam, Exercise } from "../models";

export function examResults(exam: Exam, exerciseById: Record<string, Exercise>) {
  return exam.exerciseIds.map(id => {
    const exercise = exerciseById[id];
    return {
      id,
      exercise,
      result: exercise ? exerciseTypes[exercise.type].grade(
        exam.answers[id] ?? "", exercise.solution, Object.keys(exercise.atoms),
      ) : null,
    };
  });
}

export function completeExam(
  exam: Exam,
  exerciseById: Record<string, Exercise>,
  finishedAt: number,
  newId: () => string,
) {
  const results = examResults(exam, exerciseById);
  const attempts: Attempt[] = results.map(({ id, result }) => {
    if (!result) throw new DomainError(`No se puede calificar el ejercicio desconocido: ${id}`, "missingExamExercise", { value1: id });
    return {
      id: newId(),
      exerciseId: id,
      answer: exam.answers[id] ?? "",
      status: result.status,
      aided: false,
      timestamp: finishedAt,
      mode: "exam",
      examId: exam.id,
    };
  });
  return { finished: { ...exam, finishedAt }, attempts };
}

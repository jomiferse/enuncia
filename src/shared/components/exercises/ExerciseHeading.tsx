import type { Exercise } from "../../../domain/models";
import { Badge } from "../Badge";
/** Common heading for every exercise type: number + type label, difficulty and title. */
export function ExerciseHeading({ exercise, label }: { exercise: Exercise; label: string }) {
  return (
    <>
      <div className="exercise-heading">
        <span className="eyebrow">{exercise.id.split("-").at(-1)} {label}</span>
        <Badge difficulty={exercise.difficulty} />
      </div>
      <h2 className="exercise-title">{exercise.title}</h2>
    </>
  );
}

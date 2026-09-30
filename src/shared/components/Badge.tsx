import type { Difficulty } from "../../domain/models";
import { useDifficultyLabels } from "../i18n/useDifficultyLabels";
export function Badge({ difficulty }: { difficulty: Difficulty }) {
  const difficultyLabels = useDifficultyLabels();
  return (
    <span className={`badge ${difficulty}`}>
      <i />
      {difficultyLabels[difficulty]}
    </span>
  );
}

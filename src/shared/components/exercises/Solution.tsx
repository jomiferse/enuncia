import { useTranslation } from "react-i18next";
import { formatFormula } from "../../../domain/logic/evaluation";
import { parseFormula } from "../../../domain/logic/parser";
import type { Exercise } from "../../../domain/models";
export function Solution({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  return (
    <div className="solution">
      <span className="eyebrow">{t("Solution.solucionExplicada")}</span>
      <div className="math">
        {formatFormula(
          parseFormula(exercise.solution, Object.keys(exercise.atoms)),
        )}
      </div>
      <p>{exercise.explanation}</p>
    </div>
  );
}

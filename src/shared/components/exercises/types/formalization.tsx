import { useTranslation } from "react-i18next";
import { formatFormula } from "../../../../domain/logic/evaluation";
import { parseFormula } from "../../../../domain/logic/parser";
import type { Exercise } from "../../../../domain/models";
import { ExerciseHeading } from "../ExerciseHeading";
import { FormulaEditor } from "../FormulaEditor";
import type { ExerciseTypeUi } from "../registry";
function FormalizationStatement({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  return (
    <>
      <ExerciseHeading exercise={exercise} label={t("Statement.formalizacion")} />
      <blockquote>{exercise.statement}</blockquote>
      <div className="atoms">
        <span className="eyebrow">{t("Statement.atomosDados")}</span>
        <dl>
          {Object.entries(exercise.atoms ?? {}).map(([atom, text]) => (
            <div key={atom}>
              <dt>{atom}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
function FormalizationSolution({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  return (
    <div className="solution">
      <span className="eyebrow">{t("Solution.solucionExplicada")}</span>
      <div className="math">
        {formatFormula(parseFormula(exercise.solution ?? "", Object.keys(exercise.atoms ?? {})))}
      </div>
      <p>{exercise.explanation}</p>
    </div>
  );
}
export const formalizationUi: ExerciseTypeUi = {
  Editor: FormulaEditor,
  Statement: FormalizationStatement,
  Solution: FormalizationSolution,
};

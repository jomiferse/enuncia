import { useTranslation } from "react-i18next";
import { readFormulaToStatementData } from "../../../../domain/exercises/types/formula-to-statement";
import type { Exercise } from "../../../../domain/models";
import { ExerciseHeading } from "../ExerciseHeading";
import type { EditorProps, ExerciseTypeUi } from "../registry";

function FormulaToStatementEditor({ exercise, value, onChange }: EditorProps) {
  const { t } = useTranslation();
  const { options } = readFormulaToStatementData(exercise);
  return (
    <fieldset className="fts-options">
      <legend>{t("FormulaToStatement.candidateStatements")}</legend>
      {options.map((option) => (
        <label key={option.id} className={`fts-option${value === option.id ? " selected" : ""}`}>
          <input
            type="radio"
            name={`fts-${exercise.id}`}
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          <span>{option.text}</span>
        </label>
      ))}
    </fieldset>
  );
}

function FormulaToStatementStatement({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const data = readFormulaToStatementData(exercise);
  return (
    <>
      <ExerciseHeading exercise={exercise} label={t("FormulaToStatement.label")} />
      <blockquote>{exercise.statement}</blockquote>
      <div className="fts-formula">
        <span className="eyebrow">{t("FormulaToStatement.formula")}</span>
        <div className="math">{data.normalized}</div>
      </div>
      <div className="atoms fts-dictionary">
        <span className="eyebrow">{t("FormulaToStatement.dictionary")}</span>
        <dl>
          {data.predicates.map((p) => (
            <div key={p.name}>
              <dt>{p.name}</dt>
              <dd>{p.reading}</dd>
            </div>
          ))}
          {data.constants.map((c) => (
            <div key={c.name}>
              <dt>{c.name}</dt>
              <dd>{c.reading}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}

function FormulaToStatementSolution({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const data = readFormulaToStatementData(exercise);
  const correct = data.options.find((o) => o.correct);
  const wrong = data.options.filter((o) => !o.correct);
  return (
    <div className="solution fts-solution">
      <span className="eyebrow">{t("Solution.solucionExplicada")}</span>
      <div className="math">{data.normalized}</div>
      <p>
        <strong>{t("FormulaToStatement.correctReading")}</strong> {correct?.text}
      </p>
      <p>{exercise.explanation}</p>
      <span className="eyebrow">{t("FormulaToStatement.whyNot")}</span>
      <ul>
        {wrong.map((o) => (
          <li key={o.id}>
            <em>{o.text}</em> {o.why}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const formulaToStatementUi: ExerciseTypeUi = {
  Editor: FormulaToStatementEditor,
  Statement: FormulaToStatementStatement,
  Solution: FormulaToStatementSolution,
};

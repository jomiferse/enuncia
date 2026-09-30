import { useTranslation } from "react-i18next";
import type { Exercise } from "../../../domain/models";
import { Badge } from "../Badge";
export function Statement({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="exercise-heading">
        <span className="eyebrow">
          {exercise.id.split("-").at(-1)} {t("Statement.formalizacion")}</span>
        <Badge difficulty={exercise.difficulty} />
      </div>
      <h2 className="exercise-title">{exercise.title}</h2>
      <blockquote>{exercise.statement}</blockquote>
      <div className="atoms">
        <span className="eyebrow">{t("Statement.atomosDados")}</span>
        <dl>
          {Object.entries(exercise.atoms).map(([atom, text]) => (
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

import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Grade } from "../../../domain/logic/grading";
import type { Exercise } from "../../../domain/models";
import { translateGrade } from "../../i18n/messages";
import { Solution } from "./Solution";
export function Feedback({
  result,
  exercise,
  showSolution = true,
}: {
  result: Grade;
  exercise: Exercise;
  showSolution?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={`feedback ${result.status}`} role="status">
      <div className="feedback-heading">
        {result.status === "correct" ? (
          <CheckCircle2 size={21} />
        ) : (
          <XCircle size={21} />
        )}
        <strong>{translateGrade(result)}</strong>
      </div>
      {result.counterexample && (
        <>
          <p>{t("Feedback.conEstosValoresLasDosFormulasDan")}</p>
          <div className="truth-values">
            {Object.entries(result.counterexample).map(([a, v]) => (
              <span key={a}>
                {a} = <b>{v ? t("Feedback.v") : t("Feedback.f")}</b>
              </span>
            ))}
          </div>
          <p>
            {t("Feedback.tuFormula")}<b>{result.actual ? t("Feedback.verdadera") : t("Feedback.falsa")}</b> {t("Feedback.enunciado")}<b>{result.expected ? t("Feedback.verdadero") : t("Feedback.falso")}</b>
          </p>
        </>
      )}
      {showSolution && result.status === "correct" && (
        <Solution exercise={exercise} />
      )}
    </div>
  );
}

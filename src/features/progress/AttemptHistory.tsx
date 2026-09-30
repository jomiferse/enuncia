import { Check, Lightbulb, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { exerciseById } from "../../data/catalog";
import type { Progress } from "../../domain/models";
import { dateLabel } from "../../shared/utils/format";
export function AttemptHistory({ progress }: { progress: Progress }) {
  const { t } = useTranslation();
  return (
    <section className="panel history">
      <h2>
        {t("AttemptHistory.ultimosIntentos")}<span className="muted">{t("AttemptHistory.hasta20Registros")}</span>
      </h2>
      {progress.attempts.length ? (
        [...progress.attempts]
          .reverse()
          .slice(0, 20)
          .map((a) => (
            <div className="history-row" key={a.id}>
              <span className={`history-status ${a.status}`}>
                {a.status === "correct" ? (
                  <Check size={17} />
                ) : a.status === "revealed" ? (
                  <Lightbulb size={17} />
                ) : (
                  <RotateCcw size={17} />
                )}
              </span>
              <span>
                <strong>
                  {exerciseById[a.exerciseId]?.title ?? a.exerciseId}
                </strong>
                <small>
                  {dateLabel(a.timestamp)} ·{" "}
                  {a.mode === "exam" ? t("AttemptHistory.simulacro") : t("AttemptHistory.practica")}
                  {a.aided ? t("AttemptHistory.conAyuda") : ""}
                </small>
                <code>{a.answer || t("AttemptHistory.sinFormula")}</code>
              </span>
              <span className="history-label">
                {
                  {
                    correct: t("AttemptHistory.correcto"),
                    incorrect: t("AttemptHistory.paraRepasar"),
                    invalid: t("AttemptHistory.sintaxisEnBlanco"),
                    revealed: t("AttemptHistory.solucionConsultada"),
                  }[a.status]
                }
              </span>
            </div>
          ))
      ) : (
        <p className="muted">
          {t("AttemptHistory.tuHistorialEmpezaraConElPrimerEjercicio")}</p>
      )}
    </section>
  );
}

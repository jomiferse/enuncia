import { useTranslation } from "react-i18next";
type FinishExamDialogProps = { answered: number; onCancel: () => void; onConfirm: () => void };
export function FinishExamDialog({ answered, onCancel, onConfirm }: FinishExamDialogProps) {
  const { t } = useTranslation();
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
            return;
          }
          if (event.key === "Tab") {
            const buttons =
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button",
              );
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (
              !event.shiftKey &&
              document.activeElement === last
            ) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <h2 id="finish-title">{t("FinishExamDialog.entregarSimulacro")}</h2>
        <p>
          {answered === 10
            ? t("FinishExamDialog.hasRespondidoLosDiezEjerciciosAlEntregar")
            : t("FinishExamDialog.hasRespondidoValue1De10LosValue2", { value1: answered, value2: 10 - answered })}
        </p>
        <div className="exercise-actions">
          <button
            autoFocus
            className="button secondary"
            onClick={() => onCancel()}
          >
            {t("FinishExamDialog.seguirRevisando")}</button>
          <button className="button primary" onClick={onConfirm}>
            {t("FinishExamDialog.entregar")}</button>
        </div>
      </div>
    </div>);
}

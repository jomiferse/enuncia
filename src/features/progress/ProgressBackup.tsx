import { Download, Upload } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ProgressSession } from "./useProgress";
export function ProgressBackup({ exportData, importData }: Pick<ProgressSession, "exportData" | "importData">) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <article className="panel backup-panel">
      <div className="circle-icon">
        <Download size={22} />
      </div>
      <h2>{t("ProgressBackup.tuProgresoContigo")}</h2>
      <p>
        {t("ProgressBackup.seGuardaEnEsteNavegadorExportaUna")}</p>
      <div className="exercise-actions">
        <button className="button primary" onClick={exportData}>
          <Download size={16} />
          {t("ProgressBackup.exportar")}</button>
        <button
          className="button secondary"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={16} />
          {t("ProgressBackup.importar")}</button>
      </div>
      <input
        ref={fileInput}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        aria-label={t("ProgressBackup.importarProgreso")}
        onChange={(e) => {
          const input = e.currentTarget;
          void importData(input.files?.[0]).then(() => { input.value = ""; });
        }}
      />
    </article>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Attempt, PracticeDraft, Progress } from "../../domain/models";
import { appendAttempt, emptyProgress, mergeProgress, savePracticeDraft } from "../../domain/progress/state";
import { downloadProgressBackup, readProgressBackup } from "../../infrastructure/browser/progressBackup";
import { loadProgress, preserveStoredProgress, saveProgress } from "../../infrastructure/browser/progressStorage";
import { translate as t } from "../../shared/i18n/config";
import { translateError } from "../../shared/i18n/messages";
function load() {
  try {
    return {
      data: loadProgress(),
      error: "",
    };
  } catch {
    return {
      data: emptyProgress(),
      error:
        t("useProgress.leemosElProgresoConDificultadNoSobrescribiremos"),
    };
  }
}

export function useProgress() {
  const { t } = useTranslation();
  const [initial] = useState(load);
  const [progress, setProgress] = useState<Progress>(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const [allowSave, setAllowSave] = useState(!initial.error);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!allowSave) return;
    try {
      saveProgress(progress);
      setStorageError("");
    } catch {
      setStorageError(
        t("useProgress.noSeHaPodidoGuardarEnEl"),
      );
    }
  }, [progress, allowSave, t]);
  const exportData = () => {
    downloadProgressBackup(progress);
    setNotice(t("useProgress.progresoExportadoGuardaElArchivoComoCopia"));
  };
  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const incoming = await readProgressBackup(file);
      if (!allowSave) {
        preserveStoredProgress();
        setAllowSave(true);
      }
      setProgress((p) => mergeProgress(p, incoming));
      setNotice(t("useProgress.progresoImportadoYCombinadoConTuHistorial"));
    } catch (e) {
      setNotice(t("useProgress.noSeHaImportadoElArchivoValue1", { value1: translateError(e) }));
    }
  };
  const saveDraft = (exerciseId: string, draft: PracticeDraft) => {
    setProgress(p => savePracticeDraft(p, exerciseId, draft));
  };
  const recordAttempt = (attempt: Attempt) => {
    setProgress(p => appendAttempt(p, attempt));
  };
  return { progress, setProgress, storageError, notice, setNotice, exportData, importData, saveDraft, recordAttempt };
}
export type ProgressSession = ReturnType<typeof useProgress>;

import { DomainError } from "../../domain/errors";
import type { Progress } from "../../domain/models";
import { readProgress } from "../../domain/progress/validation";

const MAX_BACKUP_BYTES = 10_000_000;

export async function readProgressBackup(file: Pick<File, "size" | "text">): Promise<Progress> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new DomainError("El archivo supera el límite de 10 MB.", "backupTooLarge");
  }
  return readProgress(JSON.parse(await file.text()));
}

export function downloadProgressBackup(progress: Progress): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(progress, null, 2)], {
    type: "application/json",
  }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `enuncia-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

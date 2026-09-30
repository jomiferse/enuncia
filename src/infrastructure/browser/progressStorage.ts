import type { Progress } from "../../domain/models";
import { emptyProgress } from "../../domain/progress/state";
import { readProgress } from "../../domain/progress/validation";

export const STORAGE_KEY = "practica-logica.progress.v1";
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadProgress(storage: ProgressStorage = localStorage): Progress {
  const saved = storage.getItem(STORAGE_KEY);
  return saved ? readProgress(JSON.parse(saved)) : emptyProgress();
}

export function saveProgress(progress: Progress, storage: ProgressStorage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function preserveStoredProgress(storage: ProgressStorage = localStorage, timestamp = Date.now()): void {
  const original = storage.getItem(STORAGE_KEY);
  if (original) storage.setItem(`${STORAGE_KEY}.recovery.${timestamp}`, original);
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProgress } from "../src/domain/progress/state.ts";
import { readProgressBackup } from "../src/infrastructure/browser/progressBackup.ts";
import { loadProgress, preserveStoredProgress, saveProgress, STORAGE_KEY } from "../src/infrastructure/browser/progressStorage.ts";

function memoryStorage(initial?: string) {
  const items = new Map<string, string>(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  return { items, getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); } };
}
test("browser storage round-trips drafts, hints and unknown exercise IDs", () => {
  const storage = memoryStorage();
  const progress = { ...emptyProgress(), drafts: { future: { answer: "P", hints: 2, revealed: true } } };
  saveProgress(progress, storage);
  assert.deepEqual(loadProgress(storage), progress);
  assert.deepEqual(loadProgress(memoryStorage()), emptyProgress());
});
test("invalid stored progress is left untouched and recovery copies preserve the original", () => {
  const storage = memoryStorage("corrupt");
  assert.throws(() => loadProgress(storage));
  assert.equal(storage.getItem(STORAGE_KEY), "corrupt");
  preserveStoredProgress(storage, 42);
  saveProgress(emptyProgress(), storage);
  assert.equal(storage.getItem(`${STORAGE_KEY}.recovery.42`), "corrupt");
});
test("storage write failures propagate so the session can report unsaved data", () => {
  assert.throws(() => saveProgress(emptyProgress(), {
    getItem: () => null,
    setItem: () => { throw new Error("Quota exceeded"); },
  }), /Quota exceeded/);
});
test("backup import rejects oversized files before reading and validates the format", async () => {
  let read = false;
  await assert.rejects(readProgressBackup({ size: 10_000_001, text: async () => { read = true; return "{}"; } }), /10 MB/);
  assert.equal(read, false);
  await assert.rejects(readProgressBackup({ size: 2, text: async () => "{}" }), /compatible/);
  assert.deepEqual(await readProgressBackup({ size: 100, text: async () => JSON.stringify(emptyProgress()) }), emptyProgress());
});

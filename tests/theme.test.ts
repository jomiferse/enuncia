import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveTheme } from "../src/domain/theme";
import { readThemePreference, saveThemePreference, THEME_STORAGE_KEY } from "../src/infrastructure/browser/theme";

test("explicit theme takes precedence and invalid preferences follow the system", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  for (const preference of [null, undefined, "invalid", "", 1]) {
    assert.equal(resolveTheme(preference, true), "dark");
    assert.equal(resolveTheme(preference, false), "light");
  }
});

test("theme storage round-trips valid preferences and rejects invalid values", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(readThemePreference(storage), null);
  saveThemePreference("dark", storage);
  assert.equal(readThemePreference(storage), "dark");
  values.set(THEME_STORAGE_KEY, "invalid");
  assert.equal(readThemePreference(storage), null);
});

test("blocked storage does not prevent theme selection", () => {
  const storage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(readThemePreference(storage), null);
  assert.doesNotThrow(() => saveThemePreference("dark", storage));
});

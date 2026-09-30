import { isTheme, resolveTheme, type Theme } from "../../domain/theme";

export const THEME_STORAGE_KEY = "enuncia.theme";
export const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";
type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

export function readThemePreference(storage?: ThemeStorage): Theme | null {
  try {
    const value = (storage ?? localStorage).getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveThemePreference(theme: Theme, storage?: ThemeStorage): void {
  try {
    (storage ?? localStorage).setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still applies when browser storage is unavailable.
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content", theme === "dark" ? "#111a16" : "#163c32",
  );
}

export function initializeTheme(): Theme {
  const theme = resolveTheme(readThemePreference(), window.matchMedia(DARK_THEME_QUERY).matches);
  applyTheme(theme);
  return theme;
}

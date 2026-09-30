import { useEffect, useRef, useState } from "react";
import { resolveTheme, type Theme } from "../../domain/theme";
import { applyTheme, DARK_THEME_QUERY, readThemePreference, saveThemePreference, THEME_STORAGE_KEY } from "../../infrastructure/browser/theme";

export function useTheme() {
  const preference = useRef(readThemePreference());
  const [theme, setTheme] = useState<Theme>(() =>
    resolveTheme(preference.current, window.matchMedia(DARK_THEME_QUERY).matches),
  );

  useEffect(() => {
    const systemTheme = window.matchMedia(DARK_THEME_QUERY);
    const syncTheme = () => {
      const next = resolveTheme(preference.current, systemTheme.matches);
      applyTheme(next);
      setTheme(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        preference.current = readThemePreference();
        syncTheme();
      }
    };
    systemTheme.addEventListener("change", syncTheme);
    window.addEventListener("storage", onStorage);
    return () => {
      systemTheme.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    preference.current = next;
    saveThemePreference(next);
    applyTheme(next);
    setTheme(next);
  };

  return { theme, toggleTheme };
}

import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "./useTheme";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const label = t(theme === "dark" ? "theme.activateLight" : "theme.activateDark");
  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}
      aria-label={label} aria-pressed={theme === "dark"} title={label}>
      {theme === "dark" ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  );
}

import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";

export const DEFAULT_LANGUAGE = "es";
export const SUPPORTED_LANGUAGES = [DEFAULT_LANGUAGE] as const;
export const resources = { es: { translation: es } };

export const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

export const translate = i18n.t.bind(i18n);

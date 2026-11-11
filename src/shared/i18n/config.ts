import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import esDeduction from "./locales/es.natural-deduction.json";
import esPredicates from "./locales/es.predicates.json";
import esResolution from "./locales/es.resolution.json";
import esTruthTable from "./locales/es.truth-table.json";

type Messages = { [key: string]: string | Messages };
function merge(...sources: Messages[]): Messages {
  const result: Messages = {};
  for (const source of sources)
    for (const [key, value] of Object.entries(source)) {
      const current = result[key];
      result[key] =
        typeof value === "object" && typeof current === "object"
          ? merge(current, value)
          : value;
    }
  return result;
}

export const DEFAULT_LANGUAGE = "es";
export const SUPPORTED_LANGUAGES = [DEFAULT_LANGUAGE] as const;
export const resources = {
  es: { translation: merge(es, esTruthTable, esPredicates, esDeduction, esResolution) as typeof es & typeof esTruthTable & typeof esPredicates & typeof esDeduction & typeof esResolution },
};

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

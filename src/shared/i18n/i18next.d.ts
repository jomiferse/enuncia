import "i18next";
import type es from "./locales/es.json";
import type esDeduction from "./locales/es.natural-deduction.json";
import type esPredicates from "./locales/es.predicates.json";
import type esResolution from "./locales/es.resolution.json";
import type esTruthTable from "./locales/es.truth-table.json";

type Translation = typeof es & typeof esTruthTable & typeof esPredicates & typeof esDeduction & typeof esResolution;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Translation };
    returnNull: false;
    enableSelector: false;
    strictKeyChecks: true;
  }
}

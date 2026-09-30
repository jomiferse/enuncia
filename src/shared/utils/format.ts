import { i18n } from "../i18n/config";

export const dateLabel = (n: number) =>
  new Date(n).toLocaleString(i18n.resolvedLanguage ?? "es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export const elapsedLabel = (ms: number) => {
  const secs = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(secs / 60)
    .toString()
    .padStart(2, "0")}:${(secs % 60).toString().padStart(2, "0")}`;
};

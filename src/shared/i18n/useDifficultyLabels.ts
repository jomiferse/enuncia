import { useTranslation } from "react-i18next";
import type { Difficulty } from "../../domain/models";

export function useDifficultyLabels(): Record<Difficulty, string> {
  const { t } = useTranslation();
  return {
    basica: t("common.difficulty.basica"),
    media: t("common.difficulty.media"),
    avanzada: t("common.difficulty.avanzada"),
  };
}

import {
  BookOpen,
  CheckCircle2,
  Clock3
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { summarizeExercises } from "../../domain/course/queries";
import type { Attempt, Exercise } from "../../domain/models";
export function ProgressRows({
  pool,
  attempts,
}: {
  pool: Exercise[];
  attempts: Attempt[];
}) {
  const { t } = useTranslation();
  const stats = summarizeExercises(pool, attempts);
  return (
    <dl className="course-counts">
      <div>
        <dt>
          <CheckCircle2 size={15} />
          {t("ProgressRows.completos")}</dt>
        <dd>{stats.complete}</dd>
      </div>
      <div>
        <dt>
          <Clock3 size={15} />
          {t("ProgressRows.incompletos")}</dt>
        <dd>{stats.incomplete}</dd>
      </div>
      <div>
        <dt>
          <BookOpen size={15} />
          {t("ProgressRows.noIntentados")}</dt>
        <dd>{stats.untouched}</dd>
      </div>
    </dl>
  );
}

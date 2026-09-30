import { useTranslation } from "react-i18next";
import type { Area } from "../../domain/models";
export function AreaTabs({
  areas,
  selected,
  onSelect,
}: {
  areas: Area[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <nav className="area-tabs" aria-label={t("AreaTabs.areasDeLaAsignatura")}>
      {areas.map((area) => (
        <button
          key={area.id}
          aria-current={selected === area.id ? "page" : undefined}
          className={selected === area.id ? "selected" : ""}
          onClick={() => onSelect(area.id)}
        >
          <span className="area-symbol">{area.symbol}</span>
          {area.title}
        </button>
      ))}
    </nav>
  );
}

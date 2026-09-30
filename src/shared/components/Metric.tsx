import type { ReactNode } from "react";
export function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article className="metric">
      <div className="metric-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

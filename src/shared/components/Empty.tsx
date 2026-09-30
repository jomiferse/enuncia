import { CheckCircle2 } from "lucide-react";
export function Empty({
  title,
  text,
  action,
  actionLabel,
}: {
  title: string;
  text: string;
  action: () => void;
  actionLabel: string;
}) {
  return (
    <div className="empty panel">
      <CheckCircle2 size={34} />
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button secondary" onClick={action}>
        {actionLabel}
      </button>
    </div>
  );
}

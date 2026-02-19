type Props = {
  label: string;
  tone?: "neutral" | "success" | "warn" | "danger";
};

const classesByTone: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-bg text-ink border-line",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200"
};

export default function StatusPill({ label, tone = "neutral" }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${classesByTone[tone]}`}>
      {label}
    </span>
  );
}


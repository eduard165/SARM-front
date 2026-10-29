import type { LucideIcon } from "lucide-react";
// Reutiliza la estructura KpiCard, sin tendencias o porcentajes simulados.
export function KpiCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number;
  note?: string;
  icon: LucideIcon;
}) {
  return (
    <article className="panel flex items-start gap-4">
      <span className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
        <Icon size={21} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="text-xs leading-5 text-stone-500">{label}</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums">
          {value.toLocaleString("es-MX")}
        </p>
        {note && (
          <p className="mt-2 text-xs leading-5 text-stone-500">{note}</p>
        )}
      </div>
    </article>
  );
}

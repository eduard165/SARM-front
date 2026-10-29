import type { Distribution } from "@/lib/summary-types";
// MiniBars ahora recibe los conteos reales; la longitud usa el total activo.
export function MiniBars({
  items,
  total,
}: {
  items: Distribution[];
  total: number;
}) {
  return (
    <ul className="space-y-5" aria-label="Distribución de animales activos">
      {items.map((item) => (
        <li key={item.id || "sin-asignacion"}>
          <div className="mb-2 flex justify-between gap-3 text-sm">
            <span className="min-w-0 break-words">{item.nombre}</span>
            <strong className="shrink-0 tabular-nums">
              {item.total.toLocaleString("es-MX")}
            </strong>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-stone-100"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-[#42795b]"
              style={{
                width: `${Math.min(100, Math.max(0, total ? (item.total / total) * 100 : 0))}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

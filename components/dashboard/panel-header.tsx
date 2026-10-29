import type { ReactNode } from "react";
// Adaptado del PanelHeader de referencia; usa los estilos actuales de SARM.
export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-xs leading-5 text-stone-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

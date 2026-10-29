import { ClipboardList } from "lucide-react";
export function EmptyState({
  description = "Los datos aparecerán cuando registres información.",
}: {
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-200 px-5 py-9 text-center">
      <ClipboardList className="mx-auto text-stone-400" size={25} />
      <p className="mt-3 text-sm leading-6 text-stone-500">{description}</p>
    </div>
  );
}

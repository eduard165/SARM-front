"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
import type { ListedUser, ListedBusiness, Profile } from "@/lib/types";
import { Modal } from "./modal";
export function UserStatusActions({
  user,
  actor,
  onChanged,
}: {
  user: ListedUser;
  actor: Profile;
  onChanged: (message: string) => void;
}) {
  const [selected, setSelected] = useState<ListedBusiness | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (user.id === actor.id || user.rol === "superadministrador")
    return <span className="text-xs text-stone-400">—</span>;
  if (actor.rol === "administrador" && user.rol !== "usuario") return null;
  if (user.bloqueo_global)
    return <span className="text-xs text-amber-800">Bloqueo global</span>;
  const memberships = user.negocios.filter(
    (n) =>
      actor.rol === "superadministrador" ||
      actor.negocios.some((m) => m.negocio_id === n.negocio_id),
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected || busy || !reason.trim()) return;
    setBusy(true);
    setError("");
    const state =
      selected.estado_membresia === "activo" ? "suspendido" : "activo";
    try {
      await api(
        `usuarios/${user.id}/estado`,
        {
          negocio_id: selected.negocio_id,
          estado: state,
          motivo: reason.trim(),
        },
        undefined,
        "PATCH",
      );
      setSelected(null);
      onChanged(
        `Acceso de @${user.nombre_usuario} ${state === "activo" ? "reactivado" : "suspendido"} en ${selected.nombre}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      {memberships.map((n) => (
        <div key={n.negocio_id}>
          <button
            type="button"
            disabled={n.estado_negocio !== "activo"}
            className="btn-secondary !min-h-8 !px-3 !py-1.5 !text-xs"
            onClick={() => {
              setSelected(n);
              setReason("");
              setError("");
            }}
          >
            {n.estado_negocio !== "activo"
              ? "Negocio suspendido"
              : n.estado_membresia === "activo"
                ? "Suspender"
                : "Reactivar"}
            {memberships.length > 1 ? ` · ${n.nombre}` : ""}
          </button>
        </div>
      ))}
      {selected && (
        <Modal
          title={`${selected.estado_membresia === "activo" ? "Suspender" : "Reactivar"} acceso`}
          onClose={() => setSelected(null)}
          busy={busy}
        >
          <form onSubmit={submit} className="space-y-5">
            <p className="text-sm leading-6 text-stone-600">
              Cuenta <strong>@{user.nombre_usuario}</strong> · {selected.nombre}
              . El cambio afecta únicamente el acceso a este negocio.
            </p>
            <label className="field">
              <span>Motivo del cambio</span>
              <textarea
                required
                minLength={1}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={busy || !reason.trim()}>
                {busy ? "Guardando…" : "Confirmar cambio"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

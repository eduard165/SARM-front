"use client";
import { useState, type FormEvent } from "react";
import { UserRoundPlus } from "lucide-react";
import type { Business } from "@/lib/types";
import { api } from "@/lib/client-api";
export function AccountForm({
  role,
  businesses,
  assigned,
  onCreated,
}: {
  role: "usuario" | "administrador";
  businesses: Business[];
  assigned?: Business;
  onCreated: (name: string, business: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") || "");
    if (password !== values.get("confirm_password")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password !== password.trim()) {
      setError("La contraseña no debe comenzar ni terminar con espacios.");
      return;
    }
    const negocio_id = assigned?.id || String(values.get("negocio_id") || "");
    if (!businesses.some((b) => b.id === negocio_id)) {
      setError("Selecciona un negocio activo.");
      return;
    }
    const body: Record<string, unknown> = { negocio_id, password };
    for (const key of [
      "nombre_usuario",
      "nombre",
      "apellido_paterno",
      "apellido_materno",
      "fecha_nacimiento",
      "sexo",
      "telefono",
    ])
      body[key] = String(values.get(key) || "").trim() || null;
    setBusy(true);
    try {
      await api(
        role === "administrador" ? "administradores" : "usuarios",
        body,
      );
      onCreated(
        String(body.nombre_usuario),
        businesses.find((b) => b.id === negocio_id)!.nombre,
      );
      form.reset();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo crear la cuenta.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <h2 className="text-xl font-semibold">
        {role === "administrador"
          ? "Nuevo administrador"
          : "Nuevo usuario operativo"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">
        {role === "administrador"
          ? "Tendrá acceso a la administración de usuarios de un solo negocio."
          : "Tendrá acceso operativo al negocio asignado."}
      </p>
      <fieldset disabled={busy} className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          <span>Negocio *</span>
          {assigned ? (
            <>
              <input value={assigned.nombre} readOnly />
              <small>La cuenta se registrará en tu negocio.</small>
            </>
          ) : (
            <select name="negocio_id" required defaultValue="">
              <option value="" disabled>
                Selecciona un negocio
              </option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="field">
          <span>Nombre de usuario *</span>
          <input
            name="nombre_usuario"
            minLength={3}
            maxLength={50}
            pattern="[A-Za-z0-9._\-]+"
            autoComplete="off"
            required
          />
          <small>Letras sin acentos, números, punto, guion y guion bajo.</small>
        </label>
        <label className="field">
          <span>Nombre(s) *</span>
          <input name="nombre" maxLength={100} required />
        </label>
        <label className="field">
          <span>Apellido paterno *</span>
          <input name="apellido_paterno" maxLength={100} required />
        </label>
        <label className="field">
          <span>Apellido materno</span>
          <input name="apellido_materno" maxLength={100} />
        </label>
        <label className="field">
          <span>Contraseña *</span>
          <input
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            required
          />
          <small>Mínimo 12 caracteres. Guárdala en un lugar seguro.</small>
        </label>
        <label className="field">
          <span>Confirmar contraseña *</span>
          <input
            name="confirm_password"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="field">
          <span>Teléfono</span>
          <input name="telefono" type="tel" maxLength={20} />
        </label>
        <label className="field">
          <span>Fecha de nacimiento</span>
          <input
            name="fecha_nacimiento"
            type="date"
            min="1900-01-01"
            max={new Date().toISOString().slice(0, 10)}
          />
        </label>
        <label className="field">
          <span>Sexo</span>
          <select name="sexo" defaultValue="">
            <option value="">Sin especificar</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
        </label>
      </fieldset>
      {error && (
        <p className="error mt-5" role="alert">
          {error}
        </p>
      )}
      <div className="mt-7 flex justify-end border-t border-stone-100 pt-6">
        <button disabled={busy} className="btn-primary">
          <UserRoundPlus size={17} />
          {busy ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </div>
    </form>
  );
}

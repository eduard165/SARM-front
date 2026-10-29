"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Building2 } from "lucide-react";
import type { Catalog } from "@/lib/types";
import { api } from "@/lib/client-api";
export function BusinessForm({
  onCreated,
}: {
  onCreated: (name: string) => Promise<void>;
}) {
  const [states, setStates] = useState<Catalog[]>([]);
  const [municipalities, setMunicipalities] = useState<Catalog[]>([]);
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setCatalogError("");
    api("catalogos/estados")
      .then((data) => {
        if (active) setStates(data);
      })
      .catch(() => {
        if (active) setCatalogError("No se pudieron cargar los estados.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    let active = true;
    setMunicipalities([]);
    setCatalogError("");
    if (!state) return;
    setLoading(true);
    api(`catalogos/municipios?estado_id=${state}`)
      .then((data) => {
        if (active) setMunicipalities(data);
      })
      .catch(() => {
        if (active) setCatalogError("No se pudieron cargar los municipios.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [state, retry]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const nombre = String(data.get("nombre") || "").trim();
    const municipio_id = Number(data.get("municipio_id"));
    if (!municipalities.some((m) => m.id === municipio_id)) {
      setError("Selecciona un municipio válido.");
      return;
    }
    setBusy(true);
    try {
      await api("negocios", {
        nombre,
        ubicacion: {
          municipio_id,
          localidad: String(data.get("localidad") || "").trim(),
          codigo_postal: String(data.get("codigo_postal") || ""),
        },
      });
      await onCreated(nombre);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "No se pudo crear el negocio.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <h2 className="text-xl font-semibold">Nuevo negocio</h2>
      <p className="mt-2 text-sm text-stone-500">
        Registra el negocio antes de crear su administrador.
      </p>
      <fieldset disabled={busy} className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          <span>Nombre del negocio *</span>
          <input name="nombre" maxLength={150} required />
        </label>
        <label className="field">
          <span>Estado *</span>
          <select
            value={state}
            onChange={(event) => setState(event.target.value)}
            required
            disabled={!states.length}
          >
            <option value="">Selecciona un estado</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Municipio *</span>
          <select
            name="municipio_id"
            key={state}
            required
            defaultValue=""
            disabled={!municipalities.length || loading}
          >
            <option value="">
              {loading ? "Cargando…" : "Selecciona un municipio"}
            </option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Localidad *</span>
          <input name="localidad" maxLength={150} required />
        </label>
        <label className="field">
          <span>Código postal *</span>
          <input
            name="codigo_postal"
            inputMode="numeric"
            pattern="[0-9]{5}"
            minLength={5}
            maxLength={5}
            required
          />
        </label>
      </fieldset>
      {catalogError && (
        <div className="mt-5">
          <p role="alert" className="error">
            {catalogError}
          </p>
          <button
            type="button"
            onClick={() => setRetry((v) => v + 1)}
            className="btn-secondary mt-3"
          >
            Reintentar catálogos
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error mt-5">
          {error}
        </p>
      )}
      <div className="mt-7 flex justify-end border-t border-stone-100 pt-6">
        <button
          className="btn-primary"
          disabled={busy || loading || !municipalities.length || !!catalogError}
        >
          <Building2 size={17} />
          {busy ? "Creando negocio…" : "Crear negocio"}
        </button>
      </div>
    </form>
  );
}

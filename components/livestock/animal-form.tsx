"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
import type { Animal, Category, Page, Species } from "@/lib/livestock-types";
import { allPages, ErrorBox, Loading, useLivestock } from "./shared";
type Values = {
  identificacion: string;
  nombre: string;
  sexo: "macho" | "hembra";
  categoria_id: string;
  fecha_nacimiento: string;
  nacimiento_estimado: boolean;
  tipo_racial: string;
  fecha_incorporacion: string;
  tipo_incorporacion: "nacimiento" | "compra" | "otro";
  procedencia: string;
  padre_id: string;
  padre_externo_identificacion: string;
  padre_externo_raza: string;
  madre_id: string;
  madre_externa_identificacion: string;
  madre_externa_raza: string;
  observaciones: string;
};
const empty: Values = {
  identificacion: "",
  nombre: "",
  sexo: "hembra",
  categoria_id: "",
  fecha_nacimiento: "",
  nacimiento_estimado: false,
  tipo_racial: "",
  fecha_incorporacion: "",
  tipo_incorporacion: "compra",
  procedencia: "",
  padre_id: "",
  padre_externo_identificacion: "",
  padre_externo_raza: "",
  madre_id: "",
  madre_externa_identificacion: "",
  madre_externa_raza: "",
  observaciones: "",
};
function initialValues(animal?: Animal): Values {
  if (!animal) return { ...empty };
  return Object.fromEntries(
    Object.keys(empty).map((k) => [k, animal[k as keyof Animal] ?? ""]),
  ) as Values;
}
export function AnimalForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Animal;
  onSaved: (animal: Animal) => void;
  onCancel?: () => void;
}) {
  const { root } = useLivestock();
  const [values, setValues] = useState<Values>(() => initialValues(initial)),
    [species, setSpecies] = useState<Species[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [speciesId, setSpeciesId] = useState(initial?.especie_id || ""),
    [loading, setLoading] = useState(true),
    [catalogError, setCatalogError] = useState(""),
    [retry, setRetry] = useState(0),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setCatalogError("");
    Promise.all([
      allPages<Species>(`${root}/especies-animales`, abort.signal),
      allPages<Category>(`${root}/categorias-animales`, abort.signal),
    ])
      .then(([s, c]) => {
        if (abort.signal.aborted) return;
        setSpecies(s);
        setCategories(c);
        if (!initial)
          setSpeciesId(
            s.find((e) => e.codigo === "bovino")?.id || s[0]?.id || "",
          );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setCatalogError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [root, initial, retry]);
  function field<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === "sexo" ? { categoria_id: "" } : {}),
    }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!speciesId) {
      setError("No hay una especie habilitada disponible.");
      return;
    }
    if (values.fecha_nacimiento > values.fecha_incorporacion) {
      setError("El nacimiento no puede ser posterior a la incorporación.");
      return;
    }
    const payload: Record<string, unknown> = { ...values };
    for (const [k, v] of Object.entries(payload))
      if (typeof v === "string") payload[k] = v.trim() || null;
    if (initial) {
      for (const k of Object.keys(payload))
        if (payload[k] === initial[k as keyof Animal]) delete payload[k];
      if (!Object.keys(payload).length) {
        setError("No hay cambios para guardar.");
        return;
      }
      payload.motivo = reason.trim();
    } else payload.especie_id = speciesId;
    setBusy(true);
    try {
      const animal = await api(
        `${root}/animales${initial ? "/" + initial.id : ""}`,
        payload,
        undefined,
        initial ? "PATCH" : "POST",
      );
      onSaved(animal);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (catalogError)
    return (
      <ErrorBox error={catalogError} onRetry={() => setRetry((v) => v + 1)} />
    );
  if (!species.length)
    return (
      <ErrorBox
        error="No hay especies habilitadas disponibles. Revisa el catálogo del backend antes de registrar animales."
        onRetry={() => setRetry((v) => v + 1)}
      />
    );
  const text = (
    key: keyof Values,
    label: string,
    max = 150,
    required = false,
  ) => (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        value={String(values[key])}
        onChange={(e) => field(key, e.target.value as never)}
        required={required}
        maxLength={max}
      />
    </label>
  );
  return (
    <form onSubmit={submit} className="panel mt-5 space-y-7">
      <fieldset disabled={busy} className="space-y-7">
        <div>
          <h2 className="mb-5 text-lg font-semibold">Identificación</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {text("identificacion", "Identificación / caravana", 100, true)}
            {text("nombre", "Nombre")}
            <label className="field">
              <span>Especie *</span>
              <select
                value={speciesId}
                disabled={!!initial}
                onChange={(e) => {
                  setSpeciesId(e.target.value);
                  field("categoria_id", "");
                }}
              >
                {species.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Sexo *</span>
              <select
                value={values.sexo}
                onChange={(e) =>
                  field("sexo", e.target.value as Values["sexo"])
                }
              >
                <option value="hembra">Hembra</option>
                <option value="macho">Macho</option>
              </select>
            </label>
            <label className="field">
              <span>Categoría</span>
              <select
                value={values.categoria_id}
                onChange={(e) => field("categoria_id", e.target.value)}
              >
                <option value="">Sin especificar</option>
                {categories
                  .filter(
                    (c) =>
                      c.especie_id === speciesId &&
                      (!c.sexo || c.sexo === values.sexo),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </label>
            {text("tipo_racial", "Raza o tipo racial (ej. Cruza)")}
          </div>
        </div>
        <div>
          <h2 className="mb-5 text-lg font-semibold">
            Nacimiento e incorporación
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="field">
              <span>Fecha de nacimiento *</span>
              <input
                type="date"
                required
                value={values.fecha_nacimiento}
                onChange={(e) => field("fecha_nacimiento", e.target.value)}
              />
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={values.nacimiento_estimado}
                onChange={(e) => field("nacimiento_estimado", e.target.checked)}
              />
              Fecha de nacimiento estimada
            </label>
            <label className="field">
              <span>Fecha de incorporación al rancho *</span>
              <input
                type="date"
                required
                value={values.fecha_incorporacion}
                onChange={(e) => field("fecha_incorporacion", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Tipo de incorporación *</span>
              <select
                value={values.tipo_incorporacion}
                onChange={(e) =>
                  field(
                    "tipo_incorporacion",
                    e.target.value as Values["tipo_incorporacion"],
                  )
                }
              >
                <option value="compra">Compra</option>
                <option value="nacimiento">Nacimiento en el rancho</option>
                <option value="otro">Otro</option>
              </select>
              <small>
                Para nacimiento en el rancho, las dos fechas deben coincidir.
              </small>
            </label>
            {text("procedencia", "Procedencia", 250)}
          </div>
        </div>
        <div>
          <h2 className="mb-5 text-lg font-semibold">Genealogía opcional</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <Parent
              side="madre"
              values={values}
              setValues={setValues}
              root={root}
              speciesId={speciesId}
              self={initial?.id}
            />
            <Parent
              side="padre"
              values={values}
              setValues={setValues}
              root={root}
              speciesId={speciesId}
              self={initial?.id}
            />
          </div>
        </div>
        <label className="field">
          <span>Observaciones</span>
          <textarea
            rows={3}
            maxLength={4000}
            value={values.observaciones}
            onChange={(e) => field("observaciones", e.target.value)}
          />
        </label>
        {initial && (
          <label className="field">
            <span>Motivo de la corrección *</span>
            <textarea
              required
              maxLength={1000}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="text-xs leading-5 text-stone-500">
        {initial
          ? "Las correcciones conservan su motivo en el historial de auditoría."
          : "La ficha se crea sin hato ni ubicación. Podrás asignarlos después desde el expediente."}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="btn-primary"
          disabled={busy || (!!initial && !reason.trim())}
        >
          {busy
            ? "Guardando…"
            : initial
              ? "Guardar corrección"
              : "Registrar animal"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
function Parent({
  side,
  values,
  setValues,
  root,
  speciesId,
  self,
}: {
  side: "madre" | "padre";
  values: Values;
  setValues: React.Dispatch<React.SetStateAction<Values>>;
  root: string;
  speciesId: string;
  self?: string;
}) {
  const idKey = side === "madre" ? "madre_id" : "padre_id",
    nameKey =
      side === "madre"
        ? "madre_externa_identificacion"
        : "padre_externo_identificacion",
    raceKey = side === "madre" ? "madre_externa_raza" : "padre_externo_raza";
  const [mode, setMode] = useState(
      values[idKey]
        ? "registrado"
        : values[nameKey] || values[raceKey]
          ? "externo"
          : "desconocido",
    ),
    [search, setSearch] = useState(""),
    [results, setResults] = useState<Animal[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  function set(key: keyof Values, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  async function find() {
    setBusy(true);
    setError("");
    try {
      const p = new URLSearchParams({
        sexo: side === "madre" ? "hembra" : "macho",
        especie_id: speciesId,
        tamano_pagina: "20",
      });
      if (search.trim()) p.set("q", search.trim());
      const r: Page<Animal> = await api(`${root}/animales?${p}`);
      setResults(r.items.filter((a) => a.id !== self));
      if (!r.items.length) setError("Sin coincidencias. Ajusta la búsqueda.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4 rounded-xl border border-stone-200 p-4">
      <label className="field">
        <span>{side === "madre" ? "Madre" : "Padre"}</span>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setResults([]);
            setError("");
            setValues((v) => ({
              ...v,
              [idKey]: "",
              [nameKey]: "",
              [raceKey]: "",
            }));
          }}
        >
          <option value="desconocido">Desconocido</option>
          <option value="registrado">Animal registrado en este negocio</option>
          <option value="externo">Progenitor externo</option>
        </select>
      </label>
      {mode === "externo" && (
        <>
          <label className="field">
            <span>Nombre o identificación externa</span>
            <input
              maxLength={150}
              value={values[nameKey]}
              onChange={(e) => set(nameKey, e.target.value)}
            />
          </label>
          <label className="field">
            <span>Raza conocida</span>
            <input
              maxLength={150}
              value={values[raceKey]}
              onChange={(e) => set(raceKey, e.target.value)}
            />
          </label>
        </>
      )}
      {mode === "registrado" && (
        <>
          <label className="field">
            <span>Buscar por identificación o nombre</span>
            <input
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy || !speciesId}
            className="btn-secondary"
            onClick={find}
          >
            {busy ? "Buscando…" : "Buscar progenitor"}
          </button>
          <label className="field">
            <span>Seleccionar progenitor</span>
            <select
              required
              value={values[idKey]}
              onChange={(e) => set(idKey, e.target.value)}
            >
              <option value="">Selecciona un animal</option>
              {values[idKey] &&
                !results.some((a) => a.id === values[idKey]) && (
                  <option value={values[idKey]}>
                    Progenitor actual · {values[idKey].slice(0, 8)}
                  </option>
                )}
              {results.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.identificacion}
                  {a.nombre ? " · " + a.nombre : ""}
                </option>
              ))}
            </select>
            <small>
              Se muestran hasta 20 coincidencias; afina la búsqueda si no
              aparece.
            </small>
          </label>
        </>
      )}
      {error && (
        <p className="text-sm text-amber-800" role="status">
          {error}
        </p>
      )}
    </div>
  );
}

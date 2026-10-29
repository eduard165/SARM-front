"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import type {
  Animal,
  Herd,
  Movement,
  Withdrawal,
  Page,
  Species,
  Category,
} from "@/lib/livestock-types";
import { dateLabel } from "@/lib/livestock-types";
import { Modal } from "@/components/modal";
import { AnimalForm } from "./animal-form";
import {
  allPages,
  useLivestock,
  useResource,
  ErrorBox,
  Loading,
  Pagination,
} from "./shared";
type Action =
  { type: "move" } | { type: "withdraw" } | { type: "undo"; bajaId: string };
export function AnimalDetail({ id }: { id: string }) {
  const { root, href } = useLivestock(),
    record = useResource<Animal>(`${root}/animales/${id}`);
  const [tab, setTab] = useState("ficha"),
    [editing, setEditing] = useState(false),
    [action, setAction] = useState<Action | null>(null),
    [notice, setNotice] = useState(""),
    [herds, setHerds] = useState<Herd[]>([]),
    [places, setPlaces] = useState<Herd[]>([]),
    [species, setSpecies] = useState<Species[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [catalogLoading, setCatalogLoading] = useState(true),
    [catalogError, setCatalogError] = useState(""),
    [catalogVersion, setCatalogVersion] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setCatalogError("");
    setCatalogLoading(true);
    Promise.all([
      allPages<Herd>(`${root}/hatos`, abort.signal),
      allPages<Herd>(`${root}/ubicaciones-ganaderas`, abort.signal),
      allPages<Species>(`${root}/especies-animales`, abort.signal),
      allPages<Category>(`${root}/categorias-animales`, abort.signal),
    ])
      .then(([h, u, s, c]) => {
        if (!abort.signal.aborted) {
          setHerds(h);
          setPlaces(u);
          setSpecies(s);
          setCategories(c);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setCatalogError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setCatalogLoading(false);
      });
    return () => abort.abort();
  }, [root, catalogVersion]);
  if (record.loading) return <Loading />;
  if (record.error)
    return <ErrorBox error={record.error} onRetry={record.reload} />;
  if (!record.data) return null;
  const a = record.data,
    name = (rows: Herd[], id: string | null) =>
      id
        ? rows.find((r) => r.id === id)?.nombre || "Registro " + id.slice(0, 8)
        : "Sin asignar";
  function done(message: string) {
    setAction(null);
    setEditing(false);
    setNotice(message);
    record.reload();
  }
  const datum = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-2 break-words text-sm font-medium">{value || "—"}</dd>
    </div>
  );
  const parent = (side: "padre" | "madre") => {
    const id = side === "padre" ? a.padre_id : a.madre_id;
    const name =
      side === "padre"
        ? a.padre_externo_identificacion
        : a.madre_externa_identificacion;
    const race = side === "padre" ? a.padre_externo_raza : a.madre_externa_raza;
    return id ? (
      <Link className="underline" href={href(`/ganado/animales/${id}`)}>
        Ver progenitor registrado
      </Link>
    ) : (
      [name, race].filter(Boolean).join(" · ") || "Desconocido"
    );
  };
  return (
    <>
      <Link
        href={href("/ganado/animales")}
        className="text-sm text-stone-500 underline"
      >
        Volver a animales
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-full">
          <span className="eyebrow">EXPEDIENTE DEL ANIMAL</span>
          <h1 className="mt-2 break-words text-3xl font-semibold">
            {a.identificacion}
            {a.nombre ? " · " + a.nombre : ""}
          </h1>
          <p
            className={`mt-3 text-sm font-semibold ${a.estado_registro === "activo" ? "text-emerald-800" : "text-amber-800"}`}
          >
            {a.estado_registro === "activo"
              ? "Activo en el negocio"
              : "Dado de baja"}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setEditing((v) => !v);
            setTab("ficha");
          }}
        >
          {editing ? "Cerrar edición" : "Editar ficha"}
        </button>
      </div>
      {notice && (
        <p className="success mt-5" role="status">
          {notice}
        </p>
      )}
      {editing ? (
        <AnimalForm
          initial={a}
          onSaved={() => done("Ficha corregida.")}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div
            className="mt-7 flex flex-wrap gap-2"
            aria-label="Secciones del expediente"
          >
            {[
              ["ficha", "Ficha"],
              ["movimientos", "Movimientos"],
              ["bajas", "Bajas"],
            ].map(([key, label]) => (
              <button
                type="button"
                className={tab === key ? "btn-primary" : "btn-secondary"}
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
                key={key}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "ficha" ? (
            <>
              <section className="panel mt-5">
                <h2 className="text-lg font-semibold">Datos básicos</h2>
                <dl className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {datum(
                    "Especie",
                    species.find((s) => s.id === a.especie_id)?.nombre ||
                      "Cargando…",
                  )}
                  {datum(
                    "Categoría",
                    a.categoria_id
                      ? categories.find((c) => c.id === a.categoria_id)
                          ?.nombre || "Sin información"
                      : "Sin especificar",
                  )}
                  {datum("Sexo", a.sexo === "hembra" ? "Hembra" : "Macho")}
                  {datum(
                    "Fecha de nacimiento",
                    dateLabel(a.fecha_nacimiento) +
                      (a.nacimiento_estimado ? " · Estimada" : ""),
                  )}
                  {datum("Raza / tipo racial", a.tipo_racial)}
                  {datum("Incorporación", dateLabel(a.fecha_incorporacion))}
                  {datum("Tipo de incorporación", a.tipo_incorporacion)}
                  {datum("Procedencia", a.procedencia)}
                  {datum("Madre", parent("madre"))}
                  {datum("Padre", parent("padre"))}
                  {datum("Registrado el", dateLabel(a.creado_en))}
                </dl>
                {a.observaciones && (
                  <div className="mt-6 border-t border-stone-100 pt-5">
                    <h3 className="text-xs text-stone-500">Observaciones</h3>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                      {a.observaciones}
                    </p>
                  </div>
                )}
              </section>
              <section className="panel mt-5">
                <h2 className="text-lg font-semibold">Hato y ubicación</h2>
                <dl className="mt-5 grid gap-6 sm:grid-cols-2">
                  {datum("Hato", name(herds, a.hato_id))}
                  {datum("Ubicación", name(places, a.ubicacion_ganadera_id))}
                </dl>
                {catalogError && (
                  <div className="mt-5">
                    <ErrorBox
                      error={catalogError}
                      onRetry={() => setCatalogVersion((v) => v + 1)}
                    />
                  </div>
                )}
                {a.estado_registro === "activo" && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      className="btn-primary"
                      disabled={catalogLoading || !!catalogError}
                      onClick={() => setAction({ type: "move" })}
                    >
                      Mover / asignar
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setAction({ type: "withdraw" })}
                    >
                      Registrar baja
                    </button>
                  </div>
                )}
              </section>
            </>
          ) : tab === "movimientos" ? (
            <History<Movement>
              type="movimientos"
              animalId={a.id}
              herds={herds}
              places={places}
            />
          ) : (
            <History<Withdrawal>
              type="bajas"
              animalId={a.id}
              herds={herds}
              places={places}
              onUndo={(bajaId) => setAction({ type: "undo", bajaId })}
            />
          )}
        </>
      )}
      {action && (
        <ActionForm
          action={action}
          animal={a}
          herds={herds}
          places={places}
          onClose={() => setAction(null)}
          onSaved={() =>
            done(
              action.type === "move"
                ? "Movimiento registrado."
                : action.type === "withdraw"
                  ? "Baja registrada."
                  : "Baja anulada; el animal vuelve a estar activo.",
            )
          }
        />
      )}
    </>
  );
}
function ActionForm({
  action,
  animal,
  herds,
  places,
  onClose,
  onSaved,
}: {
  action: Action;
  animal: Animal;
  herds: Herd[];
  places: Herd[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { root } = useLivestock();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [hato, setHato] = useState(animal.hato_id || ""),
    [place, setPlace] = useState(animal.ubicacion_ganadera_id || ""),
    [reason, setReason] = useState(""),
    [type, setType] = useState("venta"),
    [observations, setObservations] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (action.type === "move")
        await api(`${root}/animales/${animal.id}/movimientos`, {
          fecha: date,
          hato_id: hato || null,
          ubicacion_ganadera_id: place || null,
          motivo: reason.trim(),
        });
      else if (action.type === "withdraw")
        await api(`${root}/animales/${animal.id}/bajas`, {
          fecha: date,
          motivo: type,
          observaciones: observations.trim() || null,
        });
      else
        await api(`${root}/bajas-animales/${action.bajaId}/anular`, {
          motivo: reason.trim(),
        });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        action.type === "move"
          ? "Mover o asignar animal"
          : action.type === "withdraw"
            ? "Registrar baja"
            : "Anular baja equivocada"
      }
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-stone-500">
          {animal.identificacion}
          {animal.nombre ? " · " + animal.nombre : ""}
        </p>
        {action.type !== "undo" && (
          <label className="field">
            <span>Fecha *</span>
            <input
              type="date"
              required
              min={animal.fecha_incorporacion}
              max={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        )}
        {action.type === "move" && (
          <>
            <label className="field">
              <span>Hato destino</span>
              <select value={hato} onChange={(e) => setHato(e.target.value)}>
                <option value="">Sin hato</option>
                {herds
                  .filter((h) => h.estado_registro === "activo")
                  .map((h) => (
                    <option value={h.id} key={h.id}>
                      {h.nombre}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Ubicación destino</span>
              <select value={place} onChange={(e) => setPlace(e.target.value)}>
                <option value="">Sin ubicación</option>
                {places
                  .filter((h) => h.estado_registro === "activo")
                  .map((h) => (
                    <option value={h.id} key={h.id}>
                      {h.nombre}
                    </option>
                  ))}
              </select>
              <small>
                Seleccionar “Sin…” retira la asignación actual. Para
                conservarla, deja su destino seleccionado.
              </small>
            </label>
          </>
        )}
        {action.type === "withdraw" ? (
          <>
            <label className="field">
              <span>Motivo de baja *</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="venta">Venta</option>
                <option value="muerte">Muerte</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label className="field">
              <span>Observaciones</span>
              <textarea
                maxLength={2000}
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
              />
            </label>
            <p className="text-xs leading-5 text-stone-500">
              Se conservará el expediente. El animal no podrá moverse mientras
              esté de baja.
            </p>
          </>
        ) : (
          <label className="field">
            <span>
              Motivo{" "}
              {action.type === "undo" ? "de anulación" : "del movimiento"} *
            </span>
            <textarea
              required
              maxLength={1000}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        {action.type === "undo" && (
          <p className="text-xs leading-5 text-stone-500">
            La baja quedará marcada como anulada y la ficha volverá a estar
            activa. Si su hato o ubicación se archivaron, reactívalos primero.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            className="btn-primary"
            disabled={busy || (action.type !== "withdraw" && !reason.trim())}
          >
            {busy ? "Guardando…" : "Confirmar"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
function History<T extends Movement | Withdrawal>({
  type,
  animalId,
  herds,
  places,
  onUndo,
}: {
  type: "movimientos" | "bajas";
  animalId: string;
  herds: Herd[];
  places: Herd[];
  onUndo?: (id: string) => void;
}) {
  const { root } = useLivestock(),
    [page, setPage] = useState(1),
    result = useResource<Page<T>>(
      `${root}/animales/${animalId}/${type}?pagina=${page}&tamano_pagina=20`,
    );
  const name = (rows: Herd[], id: string | null) =>
    id
      ? rows.find((r) => r.id === id)?.nombre || id.slice(0, 8)
      : "Sin asignar";
  return (
    <section className="panel mt-5">
      <h2 className="mb-5 text-lg font-semibold">Historial de {type}</h2>
      {result.error ? (
        <ErrorBox error={result.error} onRetry={result.reload} />
      ) : result.loading ? (
        <Loading />
      ) : !result.data?.items.length ? (
        <p className="text-sm text-stone-500">Todavía no hay registros.</p>
      ) : (
        <div className="space-y-4">
          {result.data.items.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-stone-200 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="min-w-0 break-words text-sm font-semibold">
                  {dateLabel(row.fecha)} · {row.motivo}
                </h3>
                {type === "bajas" &&
                  ((row as Withdrawal).anulada_en ? (
                    <span className="text-xs text-stone-500">Anulada</span>
                  ) : (
                    <button
                      className="btn-secondary !text-xs"
                      onClick={() => onUndo?.(row.id)}
                    >
                      Anular baja
                    </button>
                  ))}
              </div>
              {type === "movimientos" ? (
                <div className="mt-3 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
                  <p>
                    Hato: {name(herds, (row as Movement).hato_origen_id)} →{" "}
                    {name(herds, (row as Movement).hato_destino_id)}
                  </p>
                  <p>
                    Ubicación:{" "}
                    {name(places, (row as Movement).ubicacion_origen_id)} →{" "}
                    {name(places, (row as Movement).ubicacion_destino_id)}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-stone-600">
                    {(row as Withdrawal).observaciones || "Sin observaciones"}
                  </p>
                  {(row as Withdrawal).anulada_en && (
                    <p className="mt-2 break-words text-xs text-stone-500">
                      Anulada el {dateLabel((row as Withdrawal).anulada_en)} ·{" "}
                      {(row as Withdrawal).motivo_anulacion}
                    </p>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination
        data={result.data}
        page={page}
        setPage={setPage}
        busy={result.loading || !!result.error}
      />
    </section>
  );
}

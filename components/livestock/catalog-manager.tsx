"use client";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/client-api";
import type { Herd, Page } from "@/lib/livestock-types";
import { Modal } from "@/components/modal";
import {
  useLivestock,
  useResource,
  Loading,
  ErrorBox,
  Pagination,
  tableClass,
} from "./shared";
export function CatalogManager({ places = false }: { places?: boolean }) {
  const { root } = useLivestock(),
    resource = places ? "ubicaciones-ganaderas" : "hatos",
    title = places ? "Ubicaciones ganaderas" : "Hatos";
  const [page, setPage] = useState(1),
    [state, setState] = useState(""),
    [show, setShow] = useState(false),
    [editing, setEditing] = useState<Herd | null>(null),
    [notice, setNotice] = useState("");
  const result = useResource<Page<Herd>>(
    `${root}/${resource}?pagina=${page}&tamano_pagina=20${state ? `&estado_registro=${state}` : ""}`,
  );
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm text-stone-500">
            {places
              ? "Registra potreros, corrales y establos del negocio."
              : "Organiza los animales en grupos independientes de su ubicación."}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setShow(true);
          }}
        >
          <Plus size={17} />
          {places ? "Agregar ubicación" : "Agregar hato"}
        </button>
      </div>
      {notice && (
        <p role="status" className="success mt-5">
          {notice}
        </p>
      )}
      <label className="field mt-7 max-w-xs">
        <span>Estado del catálogo</span>
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="archivado">Archivados</option>
        </select>
      </label>
      <section className="panel mt-5 !p-0">
        {result.error ? (
          <div className="p-5">
            <ErrorBox error={result.error} onRetry={result.reload} />
          </div>
        ) : result.loading ? (
          <Loading />
        ) : !result.data?.items.length ? (
          <p className="p-10 text-center text-sm text-stone-500">
            No hay registros para este filtro.
          </p>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label={`Tabla de ${title.toLowerCase()}`}
          >
            <table className={tableClass}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  {places && <th>Tipo</th>}
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.nombre}</td>
                    {places && <td>{row.tipo}</td>}
                    <td className="max-w-xs break-words">
                      {row.descripcion || "—"}
                    </td>
                    <td>
                      {row.estado_registro === "activo"
                        ? "Activo"
                        : "Archivado"}
                    </td>
                    <td>
                      <button
                        className="btn-secondary !text-xs"
                        onClick={() => {
                          setEditing(row);
                          setShow(true);
                        }}
                      >
                        Editar / estado
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Pagination
        data={result.data}
        page={page}
        setPage={setPage}
        busy={result.loading || !!result.error}
      />
      {show && (
        <CatalogForm
          places={places}
          initial={editing}
          root={root}
          onClose={() => setShow(false)}
          onSaved={() => {
            setShow(false);
            setNotice(editing ? "Registro actualizado." : "Registro creado.");
            result.reload();
          }}
        />
      )}
    </>
  );
}
function CatalogForm({
  places,
  initial,
  root,
  onClose,
  onSaved,
}: {
  places: boolean;
  initial: Herd | null;
  root: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.nombre || ""),
    [description, setDescription] = useState(initial?.descripcion || ""),
    [type, setType] = useState(initial?.tipo || "otro"),
    [state, setState] = useState(initial?.estado_registro || "activo"),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(
        `${root}/${places ? "ubicaciones-ganaderas" : "hatos"}${initial ? "/" + initial.id : ""}`,
        {
          nombre: name.trim(),
          descripcion: description.trim() || null,
          ...(places ? { tipo: type } : {}),
          ...(initial ? { estado_registro: state, motivo: reason.trim() } : {}),
        },
        undefined,
        initial ? "PATCH" : "POST",
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${initial ? "Editar" : "Agregar"} ${places ? "ubicación" : "hato"}`}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="field">
          <span>Nombre *</span>
          <input
            required
            maxLength={150}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {places && (
          <label className="field">
            <span>Tipo</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
            >
              {["potrero", "corral", "establo", "otro"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>Descripción</span>
          <textarea
            maxLength={2000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {initial && (
          <>
            <label className="field">
              <span>Estado</span>
              <select
                value={state}
                onChange={(e) => setState(e.target.value as typeof state)}
              >
                <option value="activo">Activo</option>
                <option value="archivado">Archivado</option>
              </select>
              <small>
                Para archivar, primero mueve los animales activos a otro grupo o
                lugar.
              </small>
            </label>
            <label className="field">
              <span>Motivo de la corrección *</span>
              <textarea
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            className="btn-primary"
            disabled={busy || !name.trim() || (!!initial && !reason.trim())}
          >
            {busy ? "Guardando…" : "Guardar"}
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

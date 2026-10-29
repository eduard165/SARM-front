"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw } from "lucide-react";
import type { Animal, Page } from "@/lib/livestock-types";
import { dateLabel } from "@/lib/livestock-types";
import {
  useLivestock,
  useResource,
  Loading,
  ErrorBox,
  Pagination,
  tableClass,
} from "./shared";
export function AnimalList() {
  const { root, href } = useLivestock();
  const [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [sex, setSex] = useState(""),
    [state, setState] = useState(""),
    [page, setPage] = useState(1);
  const query = new URLSearchParams({
    pagina: String(page),
    tamano_pagina: "20",
  });
  if (q) query.set("q", q);
  if (sex) query.set("sexo", sex);
  if (state) query.set("estado_registro", state);
  const result = useResource<Page<Animal>>(`${root}/animales?${query}`);
  function filter(set: (v: string) => void, value: string) {
    set(value);
    setPage(1);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    filter(setQ, search.trim());
  }
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Animales</h1>
          <p className="mt-3 text-sm text-stone-500">
            Consulta el ganado del negocio y abre su expediente para registrar
            cambios.
          </p>
        </div>
        <Link className="btn-primary" href={href("/ganado/animales/nuevo")}>
          <Plus size={17} />
          Registrar animal
        </Link>
      </div>
      <section className="panel mt-7">
        <form
          onSubmit={submit}
          className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <label className="field">
            <span>Identificación o nombre</span>
            <input
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej. PRUEBA-001 o Luna"
            />
          </label>
          <label className="field">
            <span>Sexo</span>
            <select
              value={sex}
              onChange={(e) => filter(setSex, e.target.value)}
            >
              <option value="">Todos</option>
              <option value="hembra">Hembra</option>
              <option value="macho">Macho</option>
            </select>
          </label>
          <label className="field">
            <span>Estado</span>
            <select
              value={state}
              onChange={(e) => filter(setState, e.target.value)}
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="baja">Baja</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button className="btn-primary">
              <Search size={16} />
              Buscar
            </button>
            <button
              type="button"
              className="btn-secondary"
              aria-label="Actualizar animales"
              onClick={result.reload}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </form>
        {(q || sex || state) && (
          <button
            type="button"
            className="mt-4 text-sm underline"
            onClick={() => {
              setSearch("");
              setQ("");
              setSex("");
              setState("");
              setPage(1);
            }}
          >
            Limpiar filtros
          </button>
        )}
      </section>
      <section className="panel mt-5 !p-0">
        {result.error ? (
          <div className="p-5">
            <ErrorBox error={result.error} onRetry={result.reload} />
          </div>
        ) : result.loading ? (
          <Loading />
        ) : !result.data?.items.length ? (
          <div className="p-10 text-center">
            <h2 className="font-semibold">No hay animales para mostrar</h2>
            <p className="mt-2 text-sm text-stone-500">
              Registra un animal o ajusta los filtros.
            </p>
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Tabla de animales"
          >
            <table className={tableClass}>
              <thead>
                <tr>
                  {[
                    "Identificación",
                    "Nombre",
                    "Sexo",
                    "Nacimiento",
                    "Estado",
                    "Expediente",
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold">{a.identificacion}</td>
                    <td>{a.nombre || "—"}</td>
                    <td>{a.sexo === "hembra" ? "Hembra" : "Macho"}</td>
                    <td>
                      {dateLabel(a.fecha_nacimiento)}
                      {a.nacimiento_estimado ? " · Estimado" : ""}
                    </td>
                    <td>
                      <span
                        className={
                          a.estado_registro === "activo"
                            ? "text-emerald-800"
                            : "text-amber-800"
                        }
                      >
                        {a.estado_registro === "activo" ? "Activo" : "Baja"}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="font-semibold underline"
                        href={href(`/ganado/animales/${a.id}`)}
                      >
                        Ver expediente
                      </Link>
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
    </>
  );
}

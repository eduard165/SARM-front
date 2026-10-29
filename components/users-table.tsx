"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  RefreshCw,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { UserStatusActions } from "./user-status-action";
import { api } from "@/lib/client-api";
import {
  roleNames,
  type Business,
  type Profile,
  type UsersList,
} from "@/lib/types";
interface Filters {
  q: string;
  rol: string;
  negocio_id: string;
  estado: string;
}
const empty: Filters = { q: "", rol: "", negocio_id: "", estado: "" };
export function UsersTable({ actor }: { actor: Profile }) {
  const [notice, setNotice] = useState("");
  const superadmin = actor.rol === "superadministrador";
  const [filters, setFilters] = useState<Filters>(empty);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [data, setData] = useState<UsersList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessError, setBusinessError] = useState("");
  useEffect(() => {
    if (!superadmin) return;
    const controller = new AbortController();
    setBusinessError("");
    api("negocios", undefined, controller.signal)
      .then(setBusinesses)
      .catch((error) => {
        if (!controller.signal.aborted)
          setBusinessError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los negocios.",
          );
      });
    return () => controller.abort();
  }, [superadmin, retry]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      pagina: String(page),
      tamano_pagina: String(size),
    });
    for (const [key, value] of Object.entries(filters))
      if (value) query.set(key, value);
    api("usuarios?" + query.toString(), undefined, controller.signal)
      .then((result: UsersList) => {
        if (controller.signal.aborted) return;
        if (
          !result ||
          !Array.isArray(result.items) ||
          !Number.isInteger(result.total) ||
          !Number.isInteger(result.total_paginas)
        )
          throw new Error("El servidor devolvió un listado inválido.");
        if (!superadmin) {
          const business = actor.negocios?.[0]?.negocio_id;
          if (
            result.items.some(
              (u) =>
                u.rol !== "usuario" ||
                u.id === actor.id ||
                !u.negocios?.length ||
                u.negocios.some((n) => n.negocio_id !== business),
            )
          )
            throw new Error(
              "El servidor devolvió cuentas fuera de tu negocio. No se mostrará el listado.",
            );
        }
        if (result.total_paginas > 0 && page > result.total_paginas) {
          setPage(1);
          return;
        }
        setData(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los usuarios.",
          );
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, page, size, retry, superadmin, actor.id, actor.negocios]);
  function filter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    filter("q", search.trim());
  }
  function clear() {
    setSearch("");
    setFilters({ ...empty });
    setPage(1);
  }
  const start = data?.total ? (page - 1) * size + 1 : 0;
  const end = data ? Math.min(page * size, data.total) : 0;
  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <>
      <span className="eyebrow">USUARIOS / CONSULTA</span>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Gestionar usuarios
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            {superadmin
              ? "Consulta todas las cuentas y filtra por nombre, rol, negocio o estado."
              : "Consulta los usuarios operativos de tu negocio. Tu propia cuenta no se incluye en el listado."}
          </p>
        </div>
        <Link href="/usuarios/nuevo" className="btn-primary">
          <UsersRound size={17} />
          Agregar usuario
        </Link>
      </div>
      {notice && (
        <p className="success mt-6" role="status">
          {notice}
        </p>
      )}
      <section className="panel mt-8 !p-0">
        <form
          onSubmit={submit}
          className="border-b border-stone-200 p-5 sm:p-6"
        >
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <ListFilter size={17} />
            Filtros
          </div>
          <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="field sm:col-span-2">
              <span>Buscar por nombre o usuario</span>
              <div className="input-icon">
                <Search size={17} />
                <input
                  aria-label="Buscar por nombre o usuario"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  maxLength={100}
                  placeholder="Ej. Roberto o Admin1"
                />
              </div>
            </label>
            {superadmin && (
              <label className="field">
                <span>Rol</span>
                <select
                  value={filters.rol}
                  onChange={(event) => filter("rol", event.target.value)}
                >
                  <option value="">Todos los roles</option>
                  {Object.entries(roleNames).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span>Estado de acceso</span>
              <select
                value={filters.estado}
                onChange={(event) => filter("estado", event.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </label>
            {superadmin && (
              <label className="field sm:col-span-2">
                <span>Negocio</span>
                <select
                  value={filters.negocio_id}
                  onChange={(event) => filter("negocio_id", event.target.value)}
                >
                  <option value="">Todos los negocios</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                      {b.estado_registro === "suspendido"
                        ? " · Suspendido"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" type="submit">
                <Search size={16} />
                Buscar
              </button>
              {(hasFilters || search) && (
                <button type="button" className="btn-secondary" onClick={clear}>
                  <X size={15} />
                  Limpiar
                </button>
              )}
            </div>
          </div>
          {businessError && (
            <p className="mt-4 text-xs text-red-700" role="alert">
              {businessError}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setRetry((v) => v + 1)}
              >
                Reintentar
              </button>
            </p>
          )}
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-stone-500"
          >
            {loading
              ? "Cargando usuarios…"
              : error
                ? "Listado no disponible"
                : `${data?.total ?? 0} ${(data?.total ?? 0) === 1 ? "cuenta encontrada" : "cuentas encontradas"}`}
          </p>
          <button
            type="button"
            aria-label="Actualizar listado"
            className="btn-secondary"
            disabled={loading}
            onClick={() => setRetry((v) => v + 1)}
          >
            <RefreshCw size={15} />
            Actualizar
          </button>
        </div>
        {error ? (
          <div className="p-6">
            <p className="error" role="alert">
              {error}
            </p>
            <button
              className="btn-secondary mt-4"
              onClick={() => setRetry((v) => v + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4 p-6" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-12 animate-pulse rounded-xl bg-stone-100"
              />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="px-6 py-16 text-center">
            <UsersRound size={30} className="mx-auto text-stone-300" />
            <h2 className="mt-4 text-lg font-semibold">
              {hasFilters
                ? "Sin coincidencias"
                : "No hay usuarios para mostrar"}
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              {hasFilters
                ? "Prueba con otros filtros o limpia la búsqueda."
                : superadmin
                  ? "Las cuentas registradas aparecerán aquí."
                  : "Los operativos que registres en tu negocio aparecerán aquí."}
            </p>
            {hasFilters && (
              <button className="btn-secondary mt-5" onClick={clear}>
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div
            className="max-w-full overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Tabla de usuarios"
          >
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Usuarios autorizados para la cuenta en sesión
              </caption>
              <thead className="border-b border-stone-200 bg-stone-50/70 text-[11px] uppercase tracking-wider text-stone-500">
                <tr>
                  {[
                    "Persona",
                    "Nombre de usuario",
                    "Rol",
                    "Negocio",
                    "Estado",
                    "Acciones",
                  ].map((name) => (
                    <th
                      key={name}
                      scope="col"
                      className="px-6 py-4 font-semibold"
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.items.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50/70">
                    <td className="px-6 py-5">
                      <span className="font-semibold">
                        {user.nombre_completo}
                      </span>
                      {user.id === actor.id && (
                        <span className="ml-2 rounded bg-stone-100 px-2 py-1 text-[10px] text-stone-500">
                          Tú
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-stone-600">
                      @{user.nombre_usuario}
                    </td>
                    <td className="px-6 py-5 text-stone-600">
                      {roleNames[user.rol]}
                    </td>
                    <td className="max-w-[250px] px-6 py-5 text-stone-600">
                      {user.negocios.length
                        ? user.negocios.map((n) => (
                            <span
                              key={n.negocio_id}
                              className="block leading-6"
                            >
                              {n.nombre}
                              {n.estado_membresia === "suspendido" ||
                              n.estado_negocio === "suspendido" ? (
                                <span className="ml-1 text-xs text-amber-700">
                                  (Suspendido)
                                </span>
                              ) : null}
                            </span>
                          ))
                        : user.rol === "superadministrador"
                          ? "Acceso global"
                          : "Sin negocio"}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        title={
                          user.bloqueo_global
                            ? "Cuenta con bloqueo global"
                            : undefined
                        }
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${user.estado === "activo" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${user.estado === "activo" ? "bg-emerald-600" : "bg-amber-500"}`}
                        />
                        {user.estado === "activo" ? "Activo" : "Suspendido"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <UserStatusActions
                        user={user}
                        actor={actor}
                        onChanged={(message) => {
                          setNotice(message);
                          setRetry((v) => v + 1);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-stone-200 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
            <span>
              {!loading && !error
                ? `${start}–${end} de ${data?.total ?? 0}`
                : "—"}
            </span>
            <label className="flex items-center gap-2">
              Por página
              <select
                aria-label="Usuarios por página"
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-stone-200 bg-white px-2 py-2"
              >
                {[20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              aria-label="Página anterior"
              className="btn-secondary !px-2"
              disabled={loading || !!error || page <= 1}
              onClick={() => setPage((v) => v - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span className="text-stone-500">
              {data?.total_paginas
                ? `Página ${page} de ${data.total_paginas}`
                : "Sin páginas"}
            </span>
            <button
              aria-label="Página siguiente"
              className="btn-secondary !px-2"
              disabled={
                loading || !!error || !data || page >= data.total_paginas
              }
              onClick={() => setPage((v) => v + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

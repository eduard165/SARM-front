"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client-api";
import type { Profile, Business } from "@/lib/types";
import type { Page } from "@/lib/livestock-types";
const Context = createContext<{
  business: Business;
  root: string;
  href: (path: string) => string;
} | null>(null);
export function useLivestock() {
  const c = useContext(Context);
  if (!c) throw new Error("Selecciona un negocio.");
  return c;
}
export function LivestockProvider({
  actor,
  children,
}: {
  actor: Profile;
  children: ReactNode;
}) {
  const [businesses, setBusinesses] = useState<Business[] | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const params = useSearchParams(),
    pathname = usePathname(),
    router = useRouter();
  useEffect(() => {
    const abort = new AbortController();
    setError('');
    if(actor.rol==='usuario'){
      setBusinesses(actor.negocios.filter(m=>m.estado_membresia==='activo'&&m.estado_registro==='activo').map(m=>({id:m.negocio_id,nombre:m.nombre_negocio||'Rancho',estado_registro:'activo'})));
      return ()=>abort.abort();
    }
    api("negocios", undefined, abort.signal)
      .then((rows: Business[]) => {
        if (!Array.isArray(rows))
          throw new Error("No se pudieron leer los negocios.");
        setBusinesses(
          rows.filter(
            (b) =>
              b.estado_registro === "activo" &&
              (actor.rol === "superadministrador" ||
                actor.negocios.some(
                  (m) =>
                    m.negocio_id === b.id &&
                    m.estado_membresia === "activo" &&
                    m.estado_registro === "activo",
                )),
          ),
        );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [actor, retry]);
  const requested = params.get("negocio"),
    business =
      businesses?.find((b) => b.id === requested) ||
      (!requested ? businesses?.[0] : undefined);
  useEffect(() => {
    if (business && !requested)
      router.replace(`${pathname}?negocio=${business.id}`, { scroll: false });
  }, [business, requested, pathname, router]);
  if (error)
    return <ErrorBox error={error} onRetry={() => setRetry((v) => v + 1)} />;
  if (!businesses) return <Loading />;
  if (!businesses.length)
    return (
      <div className="panel">
        <h1 className="text-2xl font-semibold">Sin negocios activos</h1>
        <p className="mt-3 text-sm text-stone-500">
          Necesitas un negocio activo para registrar y consultar ganado.
        </p>
      </div>
    );
  const href = (path: string) => `${path}?negocio=${business?.id || ""}`;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="eyebrow">GANADO</span>
          <p className="mt-2 text-sm text-stone-500">
            Expediente y manejo de bovinos
          </p>
        </div>
        <label className="field w-full sm:w-72">
          <span>Negocio activo</span>
          <select
            value={business?.id || ""}
            onChange={(e) => {
              const destination = /^\/ganado\/animales\/[^/]+$/.test(pathname)
                ? "/ganado/animales"
                : pathname;
              router.push(`${destination}?negocio=${e.target.value}`);
            }}
          >
            {!business && <option value="">Selecciona un negocio</option>}
            {businesses.map((b) => (
              <option value={b.id} key={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      {business ? (
        <Context.Provider
          key={business.id}
          value={{ business, root: `negocios/${business.id}`, href }}
        >
          {children}
        </Context.Provider>
      ) : (
        <p className="error" role="alert">
          El negocio indicado no está disponible. Selecciona uno de tus negocios
          activos.
        </p>
      )}
    </>
  );
}
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError("");
    setLoading(true);
    if (!path) {
      setLoading(false);
      return;
    }
    api(path, undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e.message || "No se pudieron cargar los datos.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [path, version]);
  return { data, loading, error, reload: () => setVersion((v) => v + 1) };
}
export async function allPages<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1,
    total = 1;
  do {
    const data: Page<T> = await api(
      `${path}${path.includes("?") ? "&" : "?"}pagina=${page}&tamano_pagina=100`,
      undefined,
      signal,
    );
    if (
      !Array.isArray(data.items) ||
      !Number.isInteger(data.total_paginas) ||
      data.pagina !== page
    )
      throw new Error("El servidor devolvió un catálogo inválido.");
    items.push(...data.items);
    total = data.total_paginas;
    page++;
  } while (page <= total);
  return items;
}
export function Loading() {
  return (
    <p className="panel text-sm text-stone-500" role="status">
      Cargando información…
    </p>
  );
}
export function ErrorBox({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="error" role="alert">
        {error}
      </p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
export function Pagination({
  data,
  page,
  setPage,
  busy,
}: {
  data: { total: number; total_paginas: number } | null;
  page: number;
  setPage: (page: number) => void;
  busy: boolean;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-stone-500">
      <span>
        {data?.total ?? 0} registros ·{" "}
        {data?.total_paginas
          ? `Página ${page} de ${data.total_paginas}`
          : "Sin páginas"}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy || !data || page >= data.total_paginas}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
export const tableClass =
  "w-full min-w-[680px] border-collapse text-left text-sm [&_th]:px-5 [&_th]:py-4 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-stone-500 [&_td]:px-5 [&_td]:py-4 [&_tr]:border-b [&_tr]:border-stone-100";

export function useDebounced(value:string,delay=300){const[s,set]=useState(value);useEffect(()=>{const t=setTimeout(()=>set(value),delay);return()=>clearTimeout(t)},[value,delay]);return s}

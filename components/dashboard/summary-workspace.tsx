"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Beef,
  Building2,
  UsersRound,
  ShieldCheck,
  UserRoundPlus,
  RefreshCw,
  Download,
  MapPin,
  FolderOpen,
} from "lucide-react";
import { api } from "@/lib/client-api";
import type { Profile, Business } from "@/lib/types";
import type { HomeSummary, Distribution } from "@/lib/summary-types";

import { KpiCard } from "./kpi-card";
import { MiniBars } from "./mini-bars";
import { PageHeading } from "./page-heading";
import { PanelHeader } from "./panel-header";
import { EmptyState } from "./empty-state";
export function SummaryWorkspace({
  actor,
  reports = false,
}: {
  actor: Profile;
  reports?: boolean;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[] | null>(null),
    [businessError, setBusinessError] = useState(""),
    [data, setData] = useState<HomeSummary | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const operative = actor.rol === "usuario",
    requested = params.get("negocio");
  useEffect(() => {
    if (!operative) return;
    setBusinessError('');
    setBusinesses(actor.negocios.filter(m=>m.estado_membresia==='activo'&&m.estado_registro==='activo').map(m=>({id:m.negocio_id,nombre:m.nombre_negocio||'Rancho',estado_registro:'activo'})));
  }, [operative, actor.negocios, retry]);
  const business = operative
    ? businesses?.find((b) => b.id === requested) ||
      (!requested ? businesses?.[0] : undefined)
    : undefined;
  const businessId = business?.id;
  useEffect(() => {
    if (operative && businessId && !requested)
      router.replace(`${pathname}?negocio=${businessId}`, { scroll: false });
  }, [operative, businessId, requested, pathname, router]);
  useEffect(() => {
    const abort = new AbortController();
    setData(null);
    setError("");
    setLoading(true);
    if (operative && !businessId) {
      setLoading(false);
      return;
    }
    api(
      "inicio/resumen" + (operative ? "?negocio_id=" + businessId : ""),
      undefined,
      abort.signal,
    )
      .then((value: HomeSummary) => {
        if (abort.signal.aborted) return;
        if (
          !value ||
          value.tipo !== actor.rol ||
          (value.tipo === "usuario" && value.negocio.id !== businessId)
        )
          throw Error("El resumen no corresponde al alcance seleccionado.");
        setData(value);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [actor.rol, operative, businessId, retry]);
  const activeData =
    data && (data.tipo !== "usuario" || data.negocio.id === businessId)
      ? data
      : null;
  const refresh = () => setRetry((v) => v + 1);
  const title = reports
    ? "Reportes"
    : `Hola, ${actor.nombre || actor.nombre_usuario}`;
  const description = reports
    ? "Resumen del alcance autorizado. Los reportes de ganado muestran el inventario registrado, no indicadores productivos."
    : operative
      ? "Consulta el inventario y la organización del ganado de tu rancho."
      : actor.rol === "superadministrador"
        ? "Resumen global de negocios y cuentas de S.A.R.M."
        : "Resumen de los usuarios operativos de tu negocio.";
  const href = (path: string) =>
    businessId ? `${path}?negocio=${businessId}` : path;
  return (
    <>
      <PageHeading
        eyebrow={reports ? "S.A.R.M. / REPORTES" : "INICIO"}
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Actualizar
            </button>

          </div>
        }
      />
      {operative && (
        <div className="mt-7">
          <label className="field max-w-sm">
            <span>Rancho / negocio activo</span>
            <select
              value={businessId || ""}
              disabled={!businesses?.length}
              onChange={(e) =>
                router.push(`${pathname}?negocio=${e.target.value}`)
              }
            >
              {!businessId && <option value="">Selecciona un negocio</option>}
              {businesses?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>
          </label>
          {businessError && (
            <p className="error mt-4" role="alert">
              {businessError}
            </p>
          )}
          {businesses && !businesses.length && (
            <div className="mt-5">
              <EmptyState description="No tienes negocios activos disponibles." />
            </div>
          )}
          {requested && businesses?.length && !businessId ? (
            <p className="error mt-4" role="alert">
              El negocio solicitado no está autorizado. Selecciona uno de tus
              negocios activos.
            </p>
          ) : null}
        </div>
      )}
      {error && (
        <p className="error mt-6" role="alert">
          {error}
        </p>
      )}
      {(loading || (operative && !businesses && !businessError)) && (
        <p className="panel mt-7 text-sm text-stone-500" role="status">
          Cargando resumen…
        </p>
      )}
      {activeData && !loading && (
        <>
          <div className="mt-6 flex flex-wrap justify-between gap-3 text-xs text-stone-500">
            <span>
              {activeData.tipo === "superadministrador"
                ? "Alcance: todos los negocios"
                : activeData.negocio.nombre}
            </span>
            <span>
              Consultado:{" "}
              {new Date(activeData.actualizado_en).toLocaleString("es-MX")}
            </span>
          </div>
          {activeData.tipo === "superadministrador" ? (
            <>
              <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Negocios registrados"
                  value={activeData.negocios.total}
                  icon={Building2}
                />
                <KpiCard
                  label="Negocios activos"
                  value={activeData.negocios.activos}
                  icon={Building2}
                />
                <KpiCard
                  label="Administradores"
                  value={activeData.usuarios.administradores}
                  icon={ShieldCheck}
                />
                <KpiCard
                  label="Usuarios operativos"
                  value={activeData.usuarios.operativos}
                  icon={UsersRound}
                />
              </section>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="panel">
                  <PanelHeader
                    title="Estado de los negocios"
                    description="Cada negocio se cuenta una sola vez."
                  />
                  <Counts
                    rows={[
                      ["Activos", activeData.negocios.activos],
                      ["Suspendidos", activeData.negocios.suspendidos],
                    ]}
                  />
                </section>
                <section className="panel">
                  <PanelHeader
                    title="Acceso de las cuentas"
                    description="Incluye superadministradores, administradores y operativos. Una cuenta está activa si conserva acceso a algún negocio activo; superadmin no requiere negocio."
                  />
                  <Counts
                    rows={[
                      ["Total de cuentas", activeData.usuarios.total],
                      ["Activas", activeData.usuarios.activos],
                      [
                        "Suspendidas o sin acceso",
                        activeData.usuarios.suspendidos,
                      ],
                      [
                        "Superadministradores",
                        activeData.usuarios.superadministradores,
                      ],
                    ]}
                  />
                </section>
              </div>
              <Actions
                items={[
                  ["Agregar negocio", "/negocios/nuevo"],
                  ["Agregar administrador", "/administradores/nuevo"],
                  ["Gestionar usuarios", "/usuarios"],
                ]}
              />
            </>
          ) : activeData.tipo === "administrador" ? (
            <>
              <section className="mt-5 grid gap-4 sm:grid-cols-3">
                <KpiCard
                  label="Operativos registrados"
                  value={activeData.usuarios.total}
                  icon={UsersRound}
                />
                <KpiCard
                  label="Operativos activos"
                  value={activeData.usuarios.activos}
                  icon={ShieldCheck}
                />
                <KpiCard
                  label="Operativos suspendidos"
                  value={activeData.usuarios.suspendidos}
                  icon={UsersRound}
                />
              </section>
              <section className="panel mt-5">
                <PanelHeader
                  title="Administración de tu negocio"
                  description="Los conteos incluyen solo usuarios operativos de este negocio y excluyen las cuentas administrativas."
                />
                <Counts
                  rows={[
                    ["Con acceso activo", activeData.usuarios.activos],
                    ["Sin acceso activo", activeData.usuarios.suspendidos],
                  ]}
                />
              </section>
              <Actions
                items={[
                  ["Agregar usuario", "/usuarios/nuevo"],
                  ["Gestionar usuarios", "/usuarios"],
                ]}
              />
            </>
          ) : (
            <>
              <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Animales activos"
                  value={activeData.inventario.activos}
                  note={`${activeData.inventario.total} registrados en total`}
                  icon={Beef}
                />
                <KpiCard
                  label="Hembras activas"
                  value={activeData.inventario.hembras_activas}
                  icon={Beef}
                />
                <KpiCard
                  label="Machos activos"
                  value={activeData.inventario.machos_activos}
                  icon={Beef}
                />
                <KpiCard
                  label="Animales de baja"
                  value={activeData.inventario.bajas}
                  icon={FolderOpen}
                />
              </section>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="panel">
                  <PanelHeader
                    title="Animales por categoría"
                    description="Distribución del inventario activo. Las categorías son las capturadas en cada ficha."
                  />
                  {activeData.categorias.length ? (
                    <MiniBars
                      items={activeData.categorias}
                      total={activeData.inventario.activos}
                    />
                  ) : (
                    <EmptyState description="Todavía no hay animales activos para distribuir." />
                  )}
                </section>
                <section className="panel">
                  <PanelHeader
                    title="Asignaciones por completar"
                    description="Conteos informativos sobre animales activos. Un animal puede aparecer en más de un grupo."
                  />
                  <Counts
                    rows={[
                      ["Sin categoría", activeData.inventario.sin_categoria],
                      ["Sin hato", activeData.inventario.sin_hato],
                      ["Sin ubicación", activeData.inventario.sin_ubicacion],
                    ]}
                  />
                </section>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <DistributionTable
                  title="Animales por hato"
                  rows={activeData.hatos}
                />
                <DistributionTable
                  title="Animales por ubicación"
                  rows={activeData.ubicaciones}
                />
              </div>
              {!reports && (
                <section className="panel mt-5">
                  <PanelHeader
                    title="Últimas fichas registradas"
                    description="Hasta cinco capturas recientes de este negocio, incluyendo animales que después hayan sido dados de baja."
                  />
                  {activeData.recientes.length ? (
                    <div
                      className="overflow-x-auto"
                      tabIndex={0}
                      role="region"
                      aria-label="Animales registrados recientemente"
                    >
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                          <tr className="text-xs text-stone-500">
                            {[
                              "Identificación",
                              "Nombre",
                              "Estado",
                              "Captura",
                            ].map((h) => (
                              <th key={h} className="px-3 py-3">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activeData.recientes.map((a) => (
                            <tr
                              className="border-t border-stone-100"
                              key={a.id}
                            >
                              <td className="px-3 py-4">
                                <Link
                                  className="font-semibold underline"
                                  href={href(`/ganado/animales/${a.id}`)}
                                >
                                  {a.identificacion}
                                </Link>
                              </td>
                              <td className="px-3 py-4">{a.nombre || "—"}</td>
                              <td className="px-3 py-4">
                                {a.estado_registro === "activo"
                                  ? "Activo"
                                  : "Baja"}
                              </td>
                              <td className="px-3 py-4">
                                {new Date(a.creado_en).toLocaleDateString(
                                  "es-MX",
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState description="Registra el primer animal para comenzar su expediente." />
                  )}
                </section>
              )}
              <Actions
                items={
                  reports
                    ? [["Ver animales", href("/ganado/animales")]]
                    : [
                        ["Registrar animal", href("/ganado/animales/nuevo")],
                        ["Ver animales", href("/ganado/animales")],
                        ["Gestionar hatos", href("/ganado/hatos")],
                      ]
                }
              />
            </>
          )}
          {!reports && (
            <Link
              href={href("/reportes")}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline"
            >
              Ver reportes en Excel y PDF
            </Link>
          )}
        </>
      )}
    </>
  );
}
function Counts({ rows }: { rows: [string, number][] }) {
  return (
    <dl className="divide-y divide-stone-100">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-4 py-4"
        >
          <dt className="text-sm text-stone-600">{label}</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {value.toLocaleString("es-MX")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function DistributionTable({
  title,
  rows,
}: {
  title: string;
  rows: Distribution[];
}) {
  return (
    <section className="panel">
      <PanelHeader
        title={title}
        description="Solo animales activos del negocio seleccionado."
      />
      {rows.length ? (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-stone-500">
              <th className="pb-3">Grupo</th>
              <th className="pb-3 text-right">Animales</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id || "sin-asignacion"}
                className="border-t border-stone-100"
              >
                <td className="max-w-[200px] break-words py-3 pr-3">
                  {r.nombre}
                </td>
                <td className="py-3 text-right font-semibold tabular-nums">
                  {r.total.toLocaleString("es-MX")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyState description="Sin animales activos para mostrar." />
      )}
    </section>
  );
}
function Actions({ items }: { items: [string, string][] }) {
  return (
    <section
      className="mt-6 flex flex-wrap gap-3"
      aria-label="Acciones rápidas"
    >
      {items.map(([label, href]) => (
        <Link key={href} className="btn-secondary" href={href}>
          <UserRoundPlus size={16} />
          {label}
        </Link>
      ))}
    </section>
  );
}

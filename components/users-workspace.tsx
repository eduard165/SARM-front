"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Plus,
  ShieldCheck,
  UserRoundPlus,
  RefreshCw,
} from "lucide-react";
import type { Business, Catalog, Profile } from "@/lib/types";
import { roleNames } from "@/lib/types";
async function api(path: string, body?: unknown) {
  const response = await fetch(
    `/api/sarm/${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (response.status === 401) {
    window.location.assign("/login");
    throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  }
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}
type Action = "usuario" | "administrador" | "negocio";
export function UsersWorkspace({ actor }: { actor: Profile }) {
  const router = useRouter();
  const [action, setAction] = useState<Action>("usuario");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const superadmin = actor.rol === "superadministrador";
  const canManage = superadmin || actor.rol === "administrador";
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setBusinesses(await api("negocios"));
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los negocios.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (canManage) void load();
    else setLoading(false);
  }, [load, canManage]);
  const active = businesses.filter((b) => b.estado_registro === "activo");
  const membership =
    actor.negocios?.length === 1 &&
    actor.negocios[0].estado_membresia === "activo"
      ? actor.negocios[0]
      : null;
  const assigned =
    !superadmin && membership
      ? active.find((b) => b.id === membership.negocio_id)
      : undefined;
  function completed(message: string) {
    setNotice(message);
    router.refresh();
  }
  const tabs: { key: Action; label: string; icon: typeof UserRoundPlus }[] = [
    { key: "usuario", label: "Crear usuario", icon: UserRoundPlus },
    ...(superadmin
      ? [
          {
            key: "administrador" as Action,
            label: "Crear administrador",
            icon: ShieldCheck,
          },
          { key: "negocio" as Action, label: "Crear negocio", icon: Building2 },
        ]
      : []),
  ];
  return (
    <>
      <span className="eyebrow">ADMINISTRACIÓN / ACCESOS</span>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Usuarios
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-500">
            {canManage
              ? "Crea las cuentas que necesita tu equipo y asigna su acceso al negocio correspondiente."
              : "Consulta los datos y el alcance de tu cuenta."}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800">
          <ShieldCheck size={15} />
          {roleNames[actor.rol]}
        </span>
      </div>
      <section className="my-8 grid gap-4 sm:grid-cols-2">
        <div className="panel flex items-center gap-4">
          <ShieldCheck size={24} />
          <div>
            <p className="text-xs text-stone-500">Mi cuenta</p>
            <p className="mt-1 font-semibold">@{actor.nombre_usuario}</p>
          </div>
        </div>
        <div className="panel flex items-center gap-4">
          <Building2 size={24} />
          <div>
            <p className="text-xs text-stone-500">
              {superadmin ? "Alcance" : "Negocio"}
            </p>
            <p className="mt-1 font-semibold">
              {superadmin
                ? "Todos los negocios"
                : actor.negocios
                    ?.filter((n) => n.estado_membresia === "activo")
                    .map((n) => n.nombre_negocio)
                    .filter(Boolean)
                    .join(", ") || "Sin negocio activo"}
            </p>
          </div>
        </div>
      </section>
      {notice && (
        <div className="success mb-6 flex gap-3" role="status">
          <CheckCircle2 size={19} className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {canManage && (
        <section className="panel !p-0">
          <div
            className="flex flex-wrap gap-2 border-b border-stone-200 p-4"
            role="tablist"
            aria-label="Operaciones de usuarios"
          >
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={action === key}
                aria-controls="account-panel"
                className={`rounded-lg px-4 py-3 text-sm font-medium ${action === key ? "bg-[#173b2f] text-white" : "text-stone-600 hover:bg-stone-100"}`}
                onClick={() => {
                  setAction(key);
                  setNotice("");
                }}
              >
                <span className="flex items-center gap-2">
                  <Icon size={17} />
                  {label}
                </span>
              </button>
            ))}
          </div>
          <div id="account-panel" role="tabpanel" className="p-5 sm:p-8">
            {action === "negocio" ? (
              <BusinessForm
                onCreated={async (name) => {
                  completed(
                    `Negocio «${name}» creado. Ya puedes asignarle un administrador.`,
                  );
                  await load();
                  setAction("administrador");
                }}
              />
            ) : loading ? (
              <p role="status" className="py-10 text-sm text-stone-500">
                Cargando negocios…
              </p>
            ) : loadError ? (
              <div>
                <p className="error" role="alert">
                  {loadError}
                </p>
                <button onClick={load} className="btn-secondary mt-4">
                  <RefreshCw size={15} />
                  Reintentar
                </button>
              </div>
            ) : active.length === 0 || (!superadmin && !assigned) ? (
              <div className="py-8">
                <h2 className="text-xl font-semibold">
                  {superadmin
                    ? "Primero crea un negocio"
                    : "No tienes un negocio activo disponible"}
                </h2>
                <p className="mt-3 text-sm text-stone-500">
                  {superadmin
                    ? "Cada administrador y usuario necesita un negocio para su registro."
                    : "Pide al superadministrador que revise tu asignación."}
                </p>
                {superadmin && (
                  <button
                    onClick={() => setAction("negocio")}
                    className="btn-primary mt-5"
                  >
                    <Plus size={17} />
                    Crear negocio
                  </button>
                )}
              </div>
            ) : (
              <AccountForm
                key={action}
                role={action === "administrador" ? "administrador" : "usuario"}
                businesses={active}
                assigned={assigned}
                onCreated={(name, business) =>
                  completed(
                    `Cuenta «${name}» creada correctamente en ${business}.`,
                  )
                }
              />
            )}
          </div>
        </section>
      )}
      {canManage && (
        <p className="mt-5 text-xs leading-6 text-stone-500">
          Esta versión permite dar de alta cuentas. La consulta del padrón,
          edición y suspensión se habilitarán cuando estén disponibles en el
          servidor.
        </p>
      )}
    </>
  );
}
function AccountForm({
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
function BusinessForm({
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

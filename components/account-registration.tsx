"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, RefreshCw } from "lucide-react";
import type { Business, Profile } from "@/lib/types";
import { api } from "@/lib/client-api";
import { AccountForm } from "./account-form";
export function AccountRegistration({
  actor,
  role,
}: {
  actor: Profile;
  role: "usuario" | "administrador";
}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBusinesses(await api("negocios"));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los negocios.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const active = businesses.filter((b) => b.estado_registro === "activo");
  const membership =
    actor.negocios?.length === 1 &&
    actor.negocios[0].estado_membresia === "activo"
      ? actor.negocios[0]
      : null;
  const assigned =
    actor.rol === "administrador" && membership
      ? active.find((b) => b.id === membership.negocio_id)
      : undefined;
  return (
    <>
      <span className="eyebrow">USUARIOS / ALTA DE CUENTA</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {role === "administrador" ? "Agregar administrador" : "Agregar usuario"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500">
        {role === "administrador"
          ? "Asigna un administrador a un único negocio."
          : "Crea una cuenta operativa para tu equipo."}
      </p>
      {notice && (
        <div className="success mt-6" role="status">
          <div className="flex gap-3">
            <CheckCircle2 size={19} />
            {notice}
          </div>
          <Link
            href="/usuarios"
            className="mt-3 inline-block font-semibold underline underline-offset-4"
          >
            Ver usuarios
          </Link>
        </div>
      )}
      <section className="panel mt-8">
        {loading ? (
          <p role="status" className="py-8 text-sm text-stone-500">
            Cargando negocios…
          </p>
        ) : error ? (
          <>
            <p role="alert" className="error">
              {error}
            </p>
            <button onClick={load} className="btn-secondary mt-4">
              <RefreshCw size={16} />
              Reintentar
            </button>
          </>
        ) : !active.length || (actor.rol === "administrador" && !assigned) ? (
          <>
            <h2 className="text-xl font-semibold">
              No hay un negocio activo disponible
            </h2>
            <p className="mt-3 text-sm text-stone-500">
              {actor.rol === "superadministrador"
                ? "Primero registra un negocio para asignar la cuenta."
                : "Solicita al superadministrador que revise tu asignación."}
            </p>
            {actor.rol === "superadministrador" && (
              <Link href="/negocios/nuevo" className="btn-primary mt-5">
                Agregar negocio
              </Link>
            )}
          </>
        ) : (
          <AccountForm
            role={role}
            businesses={active}
            assigned={assigned}
            onCreated={(name, business) => {
              setNotice(
                `Cuenta «${name}» creada correctamente en ${business}.`,
              );
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </section>
    </>
  );
}

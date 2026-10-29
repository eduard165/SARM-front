"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Home,
  Leaf,
  ListFilter,
  Menu,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { roleNames, type Profile } from "@/lib/types";
import { LogoutButton } from "./logout-button";

const titles: Record<string, string> = {
  "/inicio": "Inicio",
  "/usuarios": "Gestionar usuarios",
  "/usuarios/nuevo": "Agregar usuario",
  "/administradores/nuevo": "Agregar administrador",
  "/negocios/nuevo": "Agregar negocio",
};

function ProfileMenu({ actor }: { actor: Profile }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        ref.current.open = false;
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  const fullName = [
    actor.nombre,
    actor.apellido_paterno,
    actor.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");

  const initials =
    [actor.nombre?.[0], actor.apellido_paterno?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || actor.nombre_usuario.slice(0, 2).toUpperCase();

  return (
    <details
      ref={ref}
      className="mt-7 rounded-2xl border border-white/15 bg-white/5"
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 [&::-webkit-details-marker]:hidden"
        aria-label="Abrir información de mi perfil"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfead4] text-sm font-semibold text-[#173b2f]">
          {initials}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {actor.nombre || actor.nombre_usuario}
          </span>
          <span className="mt-1 block text-[11px] text-emerald-100/65">
            {roleNames[actor.rol]}
          </span>
        </span>

        <ChevronDown size={15} />
      </summary>

      <div className="border-t border-white/10 p-4">
        <p className="break-words text-sm font-semibold">
          {fullName || actor.nombre_usuario}
        </p>

        <dl className="mt-4 space-y-4 text-xs">
          <div>
            <dt className="text-emerald-100/55">Nombre de usuario</dt>
            <dd className="mt-1 break-all">@{actor.nombre_usuario}</dd>
          </div>

          <div>
            <dt className="text-emerald-100/55">Rol</dt>
            <dd className="mt-1">{roleNames[actor.rol]}</dd>
          </div>

          <div>
            <dt className="text-emerald-100/55">Negocio</dt>
            <dd className="mt-1 leading-5">
              {actor.rol === "superadministrador"
                ? "Acceso a todos los negocios"
                : actor.negocios?.length
                  ? actor.negocios.map((n) => (
                      <span className="block" key={n.negocio_id}>
                        {n.nombre_negocio || "Negocio asignado"}
                        {n.estado_membresia !== "activo" ? " · Suspendido" : ""}
                      </span>
                    ))
                  : "Sin negocio asignado"}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <LogoutButton />
        </div>
      </div>
    </details>
  );
}

function Navigation({
  actor,
  onNavigate,
}: {
  actor: Profile;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const superadmin = actor.rol === "superadministrador";
  const manager = superadmin || actor.rol === "administrador";

  const links = [
    ...(superadmin
      ? [
          {
            href: "/negocios/nuevo",
            label: "Agregar negocio",
            icon: Building2,
          },
          {
            href: "/administradores/nuevo",
            label: "Agregar administrador",
            icon: ShieldCheck,
          },
        ]
      : []),
    {
      href: "/usuarios/nuevo",
      label: "Agregar usuario",
      icon: UserRoundPlus,
    },
    {
      href: "/usuarios",
      label: "Gestionar usuarios",
      icon: ListFilter,
    },
  ];

  const item = ({ href, label, icon: Icon }: (typeof links)[number]) => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      aria-current={path === href ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition focus-visible:outline-2 focus-visible:outline-emerald-200 ${
        path === href
          ? "bg-[#dfead4] font-semibold text-[#173b2f]"
          : "text-emerald-50/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="shrink-0" size={17} />
      {label}
    </Link>
  );

  return (
    <nav aria-label="Menú principal" className="mt-8 space-y-1">
      {manager ? (
        <details className="group/users">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-50/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-emerald-200 [&::-webkit-details-marker]:hidden">
            <UsersRound className="shrink-0" size={17} />
            <span className="flex-1">Usuarios</span>
            <ChevronDown
              className="shrink-0 transition-transform group-open/users:rotate-180"
              size={16}
            />
          </summary>

          <div className="ml-3 mt-1 space-y-1 border-l border-white/15 pl-2">
            {links.map(item)}
          </div>
        </details>
      ) : (
        item({ href: "/inicio", label: "Inicio", icon: Home })
      )}
    </nav>
  );
}

export function AppShell({
  actor,
  children,
}: {
  actor: Profile;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const path = usePathname();

  useEffect(() => {
    dialog.current?.close();
  }, [path]);

  const sidebar = (
    <>
      <Link
        href={actor.rol === "usuario" ? "/inicio" : "/usuarios"}
        className="flex items-center gap-3"
      >
        <span className="rounded-xl bg-[#dfebd4] p-2 text-[#173b2f]">
          <Leaf size={22} />
        </span>
        <span>
          <strong className="text-lg">S.A.R.M.</strong>
          <span className="block text-xs text-emerald-100/55">
            Gestión de ranchos
          </span>
        </span>
      </Link>

      <ProfileMenu actor={actor} />

      <Navigation actor={actor} onNavigate={() => dialog.current?.close()} />

      <p className="mt-auto pt-10 text-[11px] leading-5 text-emerald-100/40">
        Software de Administración de Ranchos
      </p>
    </>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-[#173b2f] p-5 text-white lg:flex">
        {sidebar}
      </aside>

      <dialog
        ref={dialog}
        aria-label="Menú de navegación"
        className="m-0 h-dvh max-h-none w-[min(320px,90vw)] max-w-none border-0 bg-[#173b2f] p-5 text-white backdrop:bg-black/45"
        onClick={(event) => {
          if (event.target === dialog.current) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX > rect.right) dialog.current?.close();
          }
        }}
      >
        <div className="mb-5 flex justify-end">
          <button
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Cerrar menú"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>

        {sidebar}
      </dialog>

      <div className="min-w-0">
        <header className="flex min-h-20 items-center gap-4 border-b border-stone-200 bg-white px-5 sm:px-10">
          <button
            className="rounded-lg p-2 lg:hidden"
            aria-label="Abrir menú"
            onClick={() => dialog.current?.showModal()}
          >
            <Menu size={22} />
          </button>

          <div>
            <p className="text-[10px] uppercase tracking-[.16em] text-stone-400">
              S.A.R.M. /{" "}
              {actor.rol === "usuario" ? "Mi espacio" : "Administración"}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {titles[path] || "S.A.R.M."}
            </p>
          </div>

          <span className="ml-auto hidden rounded-full bg-emerald-50 px-3 py-2 text-xs text-emerald-800 sm:block">
            {roleNames[actor.rol]}
          </span>
        </header>

        <main className="mx-auto max-w-7xl p-5 sm:p-10">{children}</main>
      </div>
    </div>
  );
}
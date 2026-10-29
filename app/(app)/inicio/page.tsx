import { currentProfile } from "@/lib/access";
import { Leaf, ShieldCheck } from "lucide-react";
import { roleNames } from "@/lib/types";
export default async function WelcomePage() {
  const actor = await currentProfile();
  return (
    <>
      <span className="eyebrow">MI ESPACIO</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Hola, {actor.nombre || actor.nombre_usuario}
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500">
        Bienvenido a S.A.R.M. Puedes consultar tu información desde el círculo
        de tu perfil en el menú lateral.
      </p>
      <section className="panel mt-8 max-w-2xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Leaf size={25} />
        </div>
        <h2 className="text-xl font-semibold">Tu acceso está activo</h2>
        <p className="mt-3 flex items-center gap-2 text-sm text-stone-500">
          <ShieldCheck size={17} />
          {roleNames[actor.rol]}
        </p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-stone-500">Usuario</dt>
            <dd className="mt-1 font-medium">@{actor.nombre_usuario}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Negocio</dt>
            <dd className="mt-1 font-medium">
              {actor.rol === "superadministrador"
                ? "Acceso global"
                : actor.negocios
                    ?.filter((n) => n.estado_membresia === "activo")
                    .map((n) => n.nombre_negocio)
                    .filter(Boolean)
                    .join(", ") || "Sin negocio activo"}
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}

import { Leaf, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh bg-[#f5f7f4] lg:grid-cols-[.85fr_1.15fr]">
      <section className="flex flex-col justify-center bg-[#173b2f] p-7 text-white sm:p-12 lg:p-20">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dfebd4] text-[#173b2f]">
          <Leaf size={28} />
        </div>
        <span className="text-xs uppercase tracking-[.2em] text-emerald-100/60">
          Gestión de ranchos
        </span>
        <h2 className="mt-4 text-5xl font-semibold tracking-tight lg:text-6xl">
          S.A.R.M.
        </h2>
        <p className="mt-5 max-w-sm text-base leading-7 text-emerald-50/75">
          El acceso correcto para cada persona de tu negocio.
        </p>
        <div className="mt-12 hidden items-center gap-3 border-t border-white/15 pt-6 text-sm text-emerald-100/70 lg:flex">
          <ShieldCheck size={20} /> Administración de usuarios y accesos
        </div>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-12">
        <LoginForm />
      </section>
    </main>
  );
}

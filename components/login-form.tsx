"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserRound, LockKeyhole, ArrowRight } from "lucide-react";
export function LoginForm() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_usuario: values.get("nombre_usuario"),
          password: values.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No se pudo iniciar sesión.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo conectar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-10"
    >
      <span className="eyebrow">BIENVENIDO A S.A.R.M.</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Iniciar sesión
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500">
        Ingresa con el usuario asignado a tu cuenta.
      </p>
      <label className="field mt-8">
        <span>Nombre de usuario</span>
        <div className="input-icon">
          <UserRound size={18} />
          <input
            name="nombre_usuario"
            autoComplete="username"
            maxLength={50}
            required
            placeholder="Tu usuario"
          />
        </div>
      </label>
      <label className="field mt-5">
        <span>Contraseña</span>
        <div className="input-icon">
          <LockKeyhole size={18} />
          <input
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            maxLength={128}
            required
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>
      {error && (
        <p className="error mt-5" role="alert">
          {error}
        </p>
      )}
      <button
        className="btn-primary mt-7 w-full justify-center"
        disabled={busy}
      >
        {busy ? (
          "Ingresando…"
        ) : (
          <>
            Ingresar <ArrowRight size={17} />
          </>
        )}
      </button>
    </form>
  );
}

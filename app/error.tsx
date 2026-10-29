"use client";
import { LogoutButton } from "@/components/logout-button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">
        No pudimos cargar esta pantalla
      </h1>
      <p className="my-5 text-sm text-stone-500">
        Comprueba tu conexión e intenta nuevamente.
      </p>
      <button onClick={reset} className="btn-primary">
        Reintentar
      </button>
      <div className="mt-4">
        <LogoutButton />
      </div>
    </main>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { BusinessForm } from "./business-form";
export function BusinessRegistration() {
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  return (
    <>
      <span className="eyebrow">USUARIOS / NEGOCIOS</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Agregar negocio
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-500">
        Registra un negocio independiente y después crea su administrador.
      </p>
      {notice && (
        <div className="success mt-6" role="status">
          <div className="flex gap-3">
            <CheckCircle2 size={19} />
            {notice}
          </div>
          <Link
            href="/administradores/nuevo"
            className="mt-3 inline-block font-semibold underline underline-offset-4"
          >
            Agregar su administrador
          </Link>
        </div>
      )}
      <section className="panel mt-8">
        <BusinessForm
          key={version}
          onCreated={async (name) => {
            setNotice(`Negocio «${name}» creado correctamente.`);
            setVersion((v) => v + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </section>
    </>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { AnimalForm } from "./animal-form";
import { useLivestock } from "./shared";
export function AnimalCreate() {
  const router = useRouter(),
    { href } = useLivestock();
  return (
    <>
      <h1 className="text-3xl font-semibold">Registrar animal</h1>
      <p className="mt-3 text-sm text-stone-500">
        Crea su expediente con los datos conocidos. Los campos con * son
        obligatorios.
      </p>
      <AnimalForm
        onSaved={(a) => router.push(href(`/ganado/animales/${a.id}`))}
        onCancel={() => router.push(href("/ganado/animales"))}
      />
    </>
  );
}

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiError, profile } from "./backend";
export const currentProfile = cache(async () => {
  try {
    return await profile();
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      redirect("/login");
    throw new Error("No se pudo validar tu sesión. Intenta nuevamente.");
  }
});
export async function requireManagement(superOnly = false) {
  const actor = await currentProfile();
  if (
    actor.rol !== "superadministrador" &&
    (superOnly || actor.rol !== "administrador")
  )
    redirect("/inicio");
  return actor;
}

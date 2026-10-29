import "server-only";
import { cookies } from "next/headers";
import type { Profile } from "./types";

export const SESSION_COOKIE = "sarm_access_token";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function backend(path: string, options: RequestInit = {}) {
  const base = process.env.SARM_API_URL || "https://sarm-backend.vercel.app";
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      ...options,
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError(
      502,
      "No se pudo conectar con el servidor. Intenta nuevamente.",
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map(
                (entry: { loc?: string[]; msg?: string }) =>
                  `${entry.loc?.slice(1).join(".") || "Datos"}: ${entry.msg || "Valor inválido"}`,
              )
              .join(". ")
          : "No se pudo completar la operación.";
    throw new ApiError(response.status, message);
  }
  return data;
}
export async function token() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
export async function profile(): Promise<Profile> {
  const value = await token();
  if (!value) throw new ApiError(401, "Inicia sesión para continuar.");
  return backend("/auth/me", { headers: { Authorization: `Bearer ${value}` } });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let allowed = false;
  if (origin && host) {
    try {
      const url = new URL(origin);
      const local =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";
      allowed =
        url.host === host &&
        (url.protocol === "https:" || (local && url.protocol === "http:"));
    } catch {
      allowed = false;
    }
  }
  if (!allowed) throw new ApiError(403, "Origen de solicitud no permitido.");
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Envía los datos en formato JSON.");
}
export function errorResponse(error: unknown) {
  const status =
    error instanceof ApiError
      ? error.status
      : error instanceof SyntaxError
        ? 400
        : 500;
  const message =
    error instanceof ApiError
      ? error.message
      : status === 400
        ? "Datos JSON inválidos."
        : "No se pudo completar la operación.";
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

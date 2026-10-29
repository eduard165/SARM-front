import { cookies } from "next/headers";
import {
  ApiError,
  backend,
  checkOrigin,
  errorResponse,
  SESSION_COOKIE,
} from "@/lib/backend";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { nombre_usuario, password } = await request.json();
    if (
      typeof nombre_usuario !== "string" ||
      !nombre_usuario.trim() ||
      nombre_usuario.length > 50 ||
      typeof password !== "string" ||
      !password ||
      password.length > 128
    )
      throw new ApiError(400, "Escribe tu usuario y contraseña.");
    const session = await backend("/auth/login", {
      method: "POST",
      body: JSON.stringify({ nombre_usuario: nombre_usuario.trim(), password }),
    });
    if (typeof session?.access_token !== "string" || !session.access_token)
      throw new ApiError(502, "El servidor no devolvió una sesión válida.");
    await backend("/auth/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    (await cookies()).set(SESSION_COOKIE, session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.min(Number(session.expires_in) || 3600, 3600)),
    });
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

import {
  ApiError,
  backend,
  checkOrigin,
  errorResponse,
  profile,
  token,
} from "@/lib/backend";
import { usersQuery } from "@/lib/users-query";
import {
  livestockRoute,
  livestockQuery,
  uuidPattern,
} from "@/lib/proxy-policy";
import type { Profile } from "@/lib/types";
function ownBusiness(actor: Profile) {
  const m = actor.negocios?.length === 1 ? actor.negocios[0] : null;
  if (!m || m.estado_membresia !== "activo" || m.estado_registro !== "activo")
    throw new ApiError(403, "No tienes un negocio activo asignado.");
  return m.negocio_id;
}
async function forward(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const parts = (await context.params).path,
      path = "/" + parts.join("/"),
      method = request.method;
    const livestock = livestockRoute(path, method),
      summary = method === "GET" && path === "/inicio/resumen";
    const statusRoute =
      method === "PATCH" &&
      parts.length === 3 &&
      parts[0] === "usuarios" &&
      uuidPattern.test(parts[1]) &&
      parts[2] === "estado";
    const existing =
      (method === "GET" &&
        [
          "/usuarios",
          "/negocios",
          "/catalogos/estados",
          "/catalogos/municipios",
        ].includes(path)) ||
      (method === "POST" &&
        ["/negocios", "/administradores", "/usuarios"].includes(path));
    if (!existing && !livestock && !statusRoute && !summary)
      throw new ApiError(404, "Ruta no disponible.");
    if (method !== "GET") checkOrigin(request);
    let actor: Profile;
    try {
      actor = await profile();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403)
        throw new ApiError(
          401,
          "Tu cuenta ya no tiene acceso activo. Inicia sesión nuevamente.",
        );
      throw e;
    }
    const manager = ["superadministrador", "administrador"].includes(actor.rol);
    let query = new URLSearchParams(),
      body: Record<string, unknown> | undefined;
    if (method !== "GET") {
      const raw = await request.json();
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new ApiError(400, "Envía un objeto JSON.");
      body = raw;
    }
    if (summary) {
      const input = new URL(request.url).searchParams;
      for (const key of input.keys())
        if (key !== "negocio_id" || input.getAll(key).length !== 1)
          throw new ApiError(400, "Filtro de resumen no permitido o repetido.");
      const negocio = input.get("negocio_id");
      if (negocio && !uuidPattern.test(negocio))
        throw new ApiError(400, "Negocio inválido.");
      if (actor.rol === "superadministrador") {
        if (negocio)
          throw new ApiError(400, "El resumen global no admite negocio.");
      } else if (actor.rol === "administrador") {
        const own = ownBusiness(actor);
        if (negocio && negocio.toLowerCase() !== own.toLowerCase())
          throw new ApiError(403, "Solo puedes consultar tu negocio.");
        query.set("negocio_id", own);
      } else if (actor.rol === "usuario") {
        if (!negocio) throw new ApiError(400, "Selecciona un negocio.");
        if (
          !actor.negocios.some(
            (m) =>
              m.negocio_id.toLowerCase() === negocio.toLowerCase() &&
              m.estado_membresia === "activo" &&
              m.estado_registro === "activo",
          )
        )
          throw new ApiError(403, "Negocio no autorizado.");
        query.set("negocio_id", negocio);
      } else throw new ApiError(403, "Rol no autorizado.");
    } else if (livestock) {
      if (!["superadministrador", "usuario"].includes(actor.rol))
        throw new ApiError(
          403,
          "Tu cuenta no tiene permisos operativos de ganado.",
        );
      if (
        actor.rol !== "superadministrador" &&
        !actor.negocios?.some(
          (m) =>
            m.negocio_id.toLowerCase() === livestock.negocio &&
            m.estado_membresia === "activo" &&
            m.estado_registro === "activo",
        )
      )
        throw new ApiError(403, "Solo puedes operar en tus negocios activos.");
      try {
        query = livestockQuery(
          new URL(request.url).searchParams,
          livestock.resource,
          livestock.paginated,
          parts.length === 5,
        );
      } catch (e) {
        throw new ApiError(400, (e as Error).message);
      }
    } else if (statusRoute) {
      if (!manager) throw new ApiError(403, "No puedes gestionar accesos.");
      if (parts[1].toLowerCase() === actor.id.toLowerCase())
        throw new ApiError(403, "No puedes cambiar tu propio acceso.");
      if (
        Object.keys(body!).some(
          (k) => !["negocio_id", "estado", "motivo"].includes(k),
        ) ||
        !["activo", "suspendido"].includes(String(body!.estado)) ||
        typeof body!.motivo !== "string" ||
        !body!.motivo.trim() ||
        body!.motivo.length > 1000
      )
        throw new ApiError(400, "Estado o motivo inválido.");
      if (actor.rol === "administrador") {
        const own = ownBusiness(actor);
        if (
          body!.negocio_id != null &&
          String(body!.negocio_id).toLowerCase() !== own.toLowerCase()
        )
          throw new ApiError(403, "Solo puedes gestionar tu negocio.");
        body!.negocio_id = own;
      } else if (
        typeof body!.negocio_id !== "string" ||
        !uuidPattern.test(body!.negocio_id)
      )
        throw new ApiError(400, "Selecciona un negocio válido.");
    } else {
      if (path !== "/negocios" && !manager)
        throw new ApiError(
          403,
          "Tu cuenta no tiene permisos de administración.",
        );
      if (
        method === "POST" &&
        path !== "/usuarios" &&
        actor.rol !== "superadministrador"
      )
        throw new ApiError(403, "Esta acción requiere superadministrador.");
      if (method === "POST" && !manager)
        throw new ApiError(
          403,
          "Tu cuenta no tiene permisos de administración.",
        );
      if (path === "/catalogos/municipios") {
        const estado = new URL(request.url).searchParams.get("estado_id");
        if (!estado || !/^(?:[1-9]|[12][0-9]|3[0-2])$/.test(estado))
          throw new ApiError(400, "Selecciona un estado válido.");
        query.set("estado_id", estado);
      }
      if (method === "GET" && path === "/usuarios") {
        try {
          query = usersQuery(new URL(request.url).searchParams);
        } catch (e) {
          throw new ApiError(400, (e as Error).message);
        }
        if (actor.rol === "administrador") {
          const own = ownBusiness(actor);
          if (query.has("negocio_id") && query.get("negocio_id") !== own)
            throw new ApiError(
              403,
              "Solo puedes consultar usuarios de tu negocio.",
            );
          if (query.has("rol") && query.get("rol") !== "usuario")
            throw new ApiError(
              403,
              "Solo puedes consultar usuarios operativos.",
            );
          query.set("negocio_id", own);
          query.set("rol", "usuario");
        }
      }
    }
    const data = await backend(path + (query.size ? "?" + query : ""), {
      method,
      headers: { Authorization: `Bearer ${await token()}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (summary && (!data || data.tipo !== actor.rol))
      throw new ApiError(502, "El resumen no corresponde a tu perfil.");
    return Response.json(data, {
      status: livestock?.status ?? (method === "POST" ? 201 : 200),
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (
      request.method === "GET" &&
      new URL(request.url).pathname === "/api/sarm/usuarios" &&
      e instanceof ApiError &&
      e.status === 404
    )
      return errorResponse(
        new ApiError(
          503,
          "Verifica que el backend actualizado esté desplegado. El listado aún no está disponible.",
        ),
      );
    return errorResponse(e);
  }
}
export const GET = forward;
export const POST = forward;
export const PATCH = forward;

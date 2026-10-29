import {
  ApiError,
  backend,
  checkOrigin,
  errorResponse,
  profile,
  token,
} from "@/lib/backend";
import { usersQuery } from "@/lib/users-query";
const allowed = {
  GET: [
    "/usuarios",
    "/negocios",
    "/catalogos/estados",
    "/catalogos/municipios",
  ],
  POST: ["/negocios", "/administradores", "/usuarios"],
};
async function forward(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = "/" + (await context.params).path.join("/");
    const method = request.method as keyof typeof allowed;
    if (!allowed[method]?.includes(path))
      throw new ApiError(404, "Ruta no disponible.");
    if (method === "POST") checkOrigin(request);
    const actor = await profile();
    if (!["superadministrador", "administrador"].includes(actor.rol))
      throw new ApiError(403, "Tu cuenta no tiene permisos de administración.");
    if (
      method === "POST" &&
      path !== "/usuarios" &&
      actor.rol !== "superadministrador"
    )
      throw new ApiError(403, "Esta acción requiere superadministrador.");
    let query = "";
    if (path === "/catalogos/municipios") {
      const estado = new URL(request.url).searchParams.get("estado_id");
      if (!estado || !/^(?:[1-9]|[12][0-9]|3[0-2])$/.test(estado))
        throw new ApiError(400, "Selecciona un estado válido.");
      query = `?estado_id=${estado}`;
    }
    if (method === "GET" && path === "/usuarios") {
      let filters: URLSearchParams;
      try {
        filters = usersQuery(new URL(request.url).searchParams);
      } catch (error) {
        throw new ApiError(
          400,
          error instanceof Error ? error.message : "Filtros inválidos.",
        );
      }
      if (actor.rol === "administrador") {
        const membership =
          actor.negocios?.length === 1 ? actor.negocios[0] : null;
        if (
          !membership ||
          membership.estado_membresia !== "activo" ||
          membership.estado_registro !== "activo"
        )
          throw new ApiError(403, "No tienes un negocio activo asignado.");
        if (
          filters.has("negocio_id") &&
          filters.get("negocio_id") !== membership.negocio_id
        )
          throw new ApiError(
            403,
            "Solo puedes consultar usuarios de tu negocio.",
          );
        if (filters.has("rol") && filters.get("rol") !== "usuario")
          throw new ApiError(403, "Solo puedes consultar usuarios operativos.");
        filters.set("negocio_id", membership.negocio_id);
        filters.set("rol", "usuario");
      }
      query = "?" + filters.toString();
    }
    const data = await backend(path + query, {
      method,
      headers: { Authorization: `Bearer ${await token()}` },
      ...(method === "POST"
        ? { body: JSON.stringify(await request.json()) }
        : {}),
    });
    return Response.json(data, {
      status: method === "POST" ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      request.method === "GET" &&
      new URL(request.url).pathname === "/api/sarm/usuarios" &&
      error instanceof ApiError &&
      error.status === 404
    ) {
      return errorResponse(
        new ApiError(
          503,
          "El listado aún no está disponible en el servidor. Verifica que el backend actualizado esté desplegado.",
        ),
      );
    }
    return errorResponse(error);
  }
}
export const GET = forward;
export const POST = forward;

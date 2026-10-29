export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function livestockRoute(path: string, method: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "negocios" || !uuidPattern.test(parts[1] || "")) return null;
  const [, negocio, resource, record, action] = parts;
  const catalog = ["hatos", "ubicaciones-ganaderas"].includes(resource);
  let allowed = false,
    paginated = false;
  if (
    parts.length === 3 &&
    [
      "animales",
      "hatos",
      "ubicaciones-ganaderas",
      "especies-animales",
      "categorias-animales",
    ].includes(resource)
  ) {
    allowed =
      method === "GET" ||
      (method === "POST" &&
        ["animales", "hatos", "ubicaciones-ganaderas"].includes(resource));
    paginated = method === "GET";
  } else if (
    parts.length === 4 &&
    uuidPattern.test(record || "") &&
    (resource === "animales" || catalog)
  ) {
    allowed = ["GET", "PATCH"].includes(method);
  } else if (parts.length === 5 && uuidPattern.test(record || "")) {
    if (resource === "animales" && ["movimientos", "bajas"].includes(action)) {
      allowed = ["GET", "POST"].includes(method);
      paginated = method === "GET";
    } else if (resource === "bajas-animales" && action === "anular")
      allowed = method === "POST";
  }
  return allowed
    ? {
        negocio: negocio.toLowerCase(),
        resource,
        paginated,
        status: method === "POST" && action !== "anular" ? 201 : 200,
      }
    : null;
}
export function livestockQuery(
  input: URLSearchParams,
  resource: string,
  paginated: boolean,
  history: boolean,
) {
  const allowed = new Set(paginated ? ["q", "pagina", "tamano_pagina"] : []);
  if (paginated && !history) {
    if (resource === "animales")
      [
        "sexo",
        "estado_registro",
        "especie_id",
        "categoria_id",
        "hato_id",
        "ubicacion_ganadera_id",
      ].forEach((k) => allowed.add(k));
    if (["hatos", "ubicaciones-ganaderas"].includes(resource))
      allowed.add("estado_registro");
    if (resource === "categorias-animales") allowed.add("especie_id");
  }
  const result = new URLSearchParams();
  for (const [key, raw] of input) {
    if (!allowed.has(key) || input.getAll(key).length !== 1)
      throw new Error("Filtro no permitido o repetido.");
    const value = raw.trim();
    if (!value) continue;
    if (key === "q" && value.length > 100)
      throw new Error("La búsqueda admite hasta 100 caracteres.");
    if (
      ["pagina", "tamano_pagina"].includes(key) &&
      (!/^\d+$/.test(value) ||
        Number(value) < 1 ||
        Number(value) > (key === "pagina" ? 1000000 : 100))
    )
      throw new Error("Paginación inválida.");
    if (key.endsWith("_id") && !uuidPattern.test(value))
      throw new Error("Identificador inválido.");
    if (key === "sexo" && !["macho", "hembra"].includes(value))
      throw new Error("Sexo inválido.");
    if (
      key === "estado_registro" &&
      !(
        resource === "animales" ? ["activo", "baja"] : ["activo", "archivado"]
      ).includes(value)
    )
      throw new Error("Estado inválido.");
    result.set(key, value);
  }
  return result;
}

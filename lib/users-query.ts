export function usersQuery(input: URLSearchParams): URLSearchParams {
  const allowed = new Set([
    "q",
    "rol",
    "negocio_id",
    "estado",
    "pagina",
    "tamano_pagina",
  ]);
  for (const key of input.keys())
    if (!allowed.has(key)) throw new Error("Filtro de usuarios no permitido.");
  for (const key of allowed)
    if (input.getAll(key).length > 1)
      throw new Error("No repitas los filtros.");
  const result = new URLSearchParams();
  const q = (input.get("q") || "").trim();
  if (q.length > 100)
    throw new Error("La búsqueda admite hasta 100 caracteres.");
  if (q) result.set("q", q);
  const role = input.get("rol");
  if (role) {
    if (!["superadministrador", "administrador", "usuario"].includes(role))
      throw new Error("Rol inválido.");
    result.set("rol", role);
  }
  const state = input.get("estado");
  if (state) {
    if (!["activo", "suspendido"].includes(state))
      throw new Error("Estado inválido.");
    result.set("estado", state);
  }
  const business = input.get("negocio_id");
  if (business) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        business,
      )
    )
      throw new Error("Negocio inválido.");
    result.set("negocio_id", business);
  }
  for (const [key, max, fallback] of [
    ["pagina", 1000000, 1],
    ["tamano_pagina", 100, 20],
  ] as const) {
    const raw = input.get(key) || String(fallback);
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max)
      throw new Error("Paginación inválida.");
    result.set(key, String(Number(raw)));
  }
  return result;
}

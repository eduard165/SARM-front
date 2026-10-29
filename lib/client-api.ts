export async function api(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  method: "POST" | "PATCH" = "POST",
) {
  const response = await fetch(
    `/api/sarm/${path}`,
    body === undefined
      ? { cache: "no-store", signal }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        },
  );
  const data = await response.json().catch(() => null);
  if (response.status === 401) {
    window.location.assign("/login");
    throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  }
  if (!response.ok)
    throw new Error(data?.error || "No se pudo completar la operación.");
  return data;
}

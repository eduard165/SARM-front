import type { HomeSummary } from "./summary-types";
// Impide fórmulas de hojas de cálculo en nombres suministrados por usuarios.
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function summaryCsv(data: HomeSummary) {
  const rows: unknown[][] = [
    ["SARM", "Resumen consultado"],
    ["Actualizado en UTC", data.actualizado_en],
    [
      "Alcance",
      data.tipo === "superadministrador"
        ? "Global de administración"
        : data.negocio.nombre,
    ],
    ["Sección", "Concepto", "Cantidad"],
  ];
  if (data.tipo === "usuario") {
    for (const [key, label] of [
      ["total", "Animales registrados"],
      ["activos", "Animales activos"],
      ["bajas", "Animales de baja"],
      ["hembras_activas", "Hembras activas"],
      ["machos_activos", "Machos activos"],
      ["sin_categoria", "Activos sin categoría"],
      ["sin_hato", "Activos sin hato"],
      ["sin_ubicacion", "Activos sin ubicación"],
    ] as const)
      rows.push(["Inventario", label, data.inventario[key]]);
    for (const [key, label] of [
      ["categorias", "Categorías (activos)"],
      ["hatos", "Hatos (activos)"],
      ["ubicaciones", "Ubicaciones (activos)"],
    ] as const)
      for (const r of data[key]) rows.push([label, r.nombre, r.total]);
  } else {
    rows.push(
      [
        "Cuentas",
        data.tipo === "administrador"
          ? "Operativos de este negocio"
          : "Todas las cuentas",
        data.usuarios.total,
      ],
      ["Cuentas", "Activas", data.usuarios.activos],
      ["Cuentas", "Suspendidas", data.usuarios.suspendidos],
    );
    if (data.tipo === "superadministrador")
      rows.push(
        ["Negocios", "Total", data.negocios.total],
        ["Negocios", "Activos", data.negocios.activos],
        ["Negocios", "Suspendidos", data.negocios.suspendidos],
        ["Roles", "Superadministradores", data.usuarios.superadministradores],
        ["Roles", "Administradores", data.usuarios.administradores],
        ["Roles", "Operativos", data.usuarios.operativos],
      );
  }
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

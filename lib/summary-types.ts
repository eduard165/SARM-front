export interface AccessCounts {
  total: number;
  activos: number;
  suspendidos: number;
}
export interface SummaryBase {
  actualizado_en: string;
}
export interface GlobalSummary extends SummaryBase {
  tipo: "superadministrador";
  negocio: null;
  negocios: AccessCounts;
  usuarios: AccessCounts & {
    superadministradores: number;
    administradores: number;
    operativos: number;
  };
}
export interface AdminSummary extends SummaryBase {
  tipo: "administrador";
  negocio: { id: string; nombre: string };
  usuarios: AccessCounts;
}
export interface Distribution {
  id: string | null;
  nombre: string;
  total: number;
}
export interface RanchSummary extends SummaryBase {
  tipo: "usuario";
  negocio: { id: string; nombre: string };
  inventario: {
    total: number;
    activos: number;
    bajas: number;
    hembras_activas: number;
    machos_activos: number;
    sin_categoria: number;
    sin_hato: number;
    sin_ubicacion: number;
  };
  categorias: Distribution[];
  hatos: Distribution[];
  ubicaciones: Distribution[];
  recientes: {
    id: string;
    identificacion: string;
    nombre: string | null;
    sexo: "macho" | "hembra";
    estado_registro: "activo" | "baja";
    fecha_incorporacion: string;
    creado_en: string;
  }[];
}
export type HomeSummary = GlobalSummary | AdminSummary | RanchSummary;

export interface Page<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano_pagina: number;
  total_paginas: number;
}
export interface Species {
  id: string;
  codigo: string;
  nombre: string;
  habilitada: boolean;
}
export interface Category {
  id: string;
  especie_id: string;
  codigo: string;
  nombre: string;
  sexo: "macho" | "hembra" | null;
}
export interface Animal {
  id: string;
  negocio_id: string;
  especie_id: string;
  identificacion: string;
  nombre: string | null;
  sexo: "macho" | "hembra";
  categoria_id: string | null;
  fecha_nacimiento: string;
  nacimiento_estimado: boolean;
  tipo_racial: string | null;
  fecha_incorporacion: string;
  tipo_incorporacion: "nacimiento" | "compra" | "otro";
  procedencia: string | null;
  padre_id: string | null;
  padre_externo_identificacion: string | null;
  padre_externo_raza: string | null;
  madre_id: string | null;
  madre_externa_identificacion: string | null;
  madre_externa_raza: string | null;
  hato_id: string | null;
  ubicacion_ganadera_id: string | null;
  estado_registro: "activo" | "baja";
  observaciones: string | null;
  creado_en: string;
  actualizado_en: string;
}
export interface Herd {
  id: string;
  negocio_id: string;
  nombre: string;
  descripcion: string | null;
  estado_registro: "activo" | "archivado";
  tipo?: "potrero" | "corral" | "establo" | "otro";
}
export interface Movement {
  id: string;
  animal_id: string;
  fecha: string;
  hato_origen_id: string | null;
  hato_destino_id: string | null;
  ubicacion_origen_id: string | null;
  ubicacion_destino_id: string | null;
  motivo: string;
  creado_en: string;
}
export interface Withdrawal {
  id: string;
  animal_id: string;
  fecha: string;
  motivo: "venta" | "muerte" | "otro";
  observaciones: string | null;
  anulada_en: string | null;
  anulada_por: string | null;
  motivo_anulacion: string | null;
}
export function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const parts = value.slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

export type Role = "superadministrador" | "administrador" | "usuario";
export interface Membership {
  negocio_id: string;
  estado_membresia: string;
  nombre_negocio?: string;
  estado_registro?: string;
}
export interface Profile {
  id: string;
  nombre_usuario: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  rol: Role;
  bloqueo_global: boolean;
  negocios: Membership[];
}
export interface Business {
  id: string;
  nombre: string;
  estado_registro: string;
}
export interface Catalog {
  id: number;
  nombre: string;
}
export const roleNames: Record<Role, string> = {
  superadministrador: "Superadministrador",
  administrador: "Administrador",
  usuario: "Usuario operativo",
};

export interface ListedBusiness {
  negocio_id: string;
  nombre: string;
  estado_membresia: "activo" | "suspendido";
  estado_negocio: "activo" | "suspendido";
}
export interface ListedUser {
  id: string;
  nombre_usuario: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  nombre_completo: string;
  rol: Role;
  estado: "activo" | "suspendido";
  bloqueo_global: boolean;
  creado_en: string;
  negocios: ListedBusiness[];
}
export interface UsersList {
  items: ListedUser[];
  total: number;
  pagina: number;
  tamano_pagina: number;
  total_paginas: number;
}

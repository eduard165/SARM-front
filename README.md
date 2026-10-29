# S.A.R.M. — Administración de usuarios

Next.js + Tailwind, conectado al backend FastAPI en https://sarm-backend.vercel.app.

## Iniciar

Detén el frontend anterior con Ctrl+C y usa el contenido de esta carpeta. Conserva tu `.git` y tu configuración local si tienes valores personalizados. Se retiró `components/users-workspace.tsx`; si copias sobre el proyecto anterior, puedes borrar ese archivo porque ya no se utiliza.

```powershell
npm install
npm run dev
```

Abre http://localhost:3000. Se usa el mismo usuario y contraseña de las cuentas que ya registraste. No se incluyen contraseñas ni claves de Supabase.

La única variable del frontend es:

```dotenv
SARM_API_URL=https://sarm-backend.vercel.app
```

Ya viene en `.env.local` para ejecución local. En Vercel añádela en Environment Variables. No necesita NEXT_PUBLIC. No se incluye `.env.example`.

## Pantallas independientes

| Ruta                     | Superadministrador                    | Administrador                                | Operativo  |
| ------------------------ | ------------------------------------- | -------------------------------------------- | ---------- |
| `/usuarios`              | Todas las cuentas, incluida la propia | Solo operativos de su negocio, sin incluirse | Sin acceso |
| `/usuarios/nuevo`        | Crear operativo en negocio activo     | Crear operativo en su negocio                | Sin acceso |
| `/administradores/nuevo` | Crear administrador                   | Sin acceso                                   | Sin acceso |
| `/negocios/nuevo`        | Crear negocio                         | Sin acceso                                   | Sin acceso |
| `/inicio`                | Bienvenida                            | Bienvenida                                   | Bienvenida |

El superadministrador y el administrador entran directamente a Gestionar usuarios. El operativo entra a Inicio y no ve ningún menú de Usuarios. Las páginas protegidas verifican su rol en el servidor incluso cuando se escribe la URL directamente. La API del frontend también devuelve 403 al operativo en todas las rutas administrativas.

Debajo de S.A.R.M. aparece un círculo con iniciales y el nombre. Al abrirlo se despliega el nombre completo, nombre de usuario, rol, negocio y cierre de sesión. En móvil se accede mediante el botón Abrir menú; el panel de navegación es un diálogo con cierre por botón y Escape.

## Tabla de usuarios

Usa `GET /usuarios` del backend:

- Búsqueda por nombre y nombre de usuario. Pulsa Buscar o Enter.
- Filtros por estado; el superadministrador también puede filtrar rol y negocio.
- Paginación de 20, 50 o 100 cuentas por página, aplicada en el servidor.
- Botones para actualizar y limpiar filtros.
- Estados de carga, sin resultados y error con reintento.
- La cuenta propia del superadministrador se identifica con Tú.
- El administrador no recibe ni muestra otras membresías de una cuenta compartida.

Los desplegables aplican sus filtros de inmediato; la búsqueda se aplica al pulsar Buscar. Cambiar un filtro o el tamaño regresa a la primera página.

No se agregan botones de edición, suspensión o borrado: esas operaciones no existen todavía en el backend. El estado de acceso es el que calcula la API, incluyendo bloqueos globales, membresías y negocios suspendidos.

## Backend y base de datos

Requiere el backend 0.4.0 con `GET /usuarios` y la migración 10 aplicada en el proyecto separado `sarm-db`.

**Este frontend no incluye migraciones ni modifica el backend o la base de datos.** Si el servidor aún no publica el listado, se muestra un mensaje indicando que falta desplegar la actualización.

Se conservan las altas de negocios, administradores y operativos. Después de crear una cuenta se muestra una confirmación y el enlace Ver usuarios. Después de crear un negocio se ofrece Agregar su administrador.

## Sesión

Los tokens permanecen en una cookie HttpOnly, SameSite=Lax y Secure en producción. El navegador llama a Next.js y Next.js llama a FastAPI; no se necesitan claves secretas de Supabase ni cambios de CORS para este flujo.

El backend actual no tiene renovación de sesión ni revocación por logout. Al vencer la sesión se requiere otro login; salir elimina la cookie de esta aplicación.

## Comprobaciones

```powershell
npm run build
npm run typecheck
npm test
```

Las pruebas de integración levantan una API simulada y el frontend local. Verifican login, cookie, navegación por rol, URLs protegidas, listado, filtros, paginación, bloqueo de negocio ajeno, altas existentes y cierre de sesión, sin tocar tu Supabase.

Para la aceptación con tus datos, inicia sesión con el superadministrador y ambos administradores. Comprueba la tabla, los filtros, que cada administrador solo vea su negocio y que un operativo no pueda abrir las rutas administrativas.

Resultado de validación: compilación de producción y TypeScript aprobados; 42 comprobaciones de integración con API simulada. Revisión en navegador de escritorio (1440 px) y móvil (390 px): login, tabla, búsqueda, limpieza de filtros, perfil, navegación móvil, alta de negocio y menú del operativo. Estas pruebas no crean registros en Supabase.

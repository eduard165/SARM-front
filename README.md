# SARM Frontend 0.3.0 — usuarios y ganado

Next.js + React + Tailwind. Frontend conectado con SARM API 0.5.0. Base de trabajo: repositorio eduard165/SARM-front, rama main, commit 29a10b5f9da1a2c54636ba1470fbd8afd0e362b5.

## Ejecutar y actualizar

Conserva tu `.env.local`, `.git` y configuracion de Vercel. Copia el contenido de esta entrega sobre la carpeta del frontend existente, sin sustituir el repositorio entero. El paquete no incluye node_modules, .next, credenciales ni archivos nuevos de entorno.

```powershell
npm ci
npm run dev
```

Abrir http://localhost:3000. El servidor de Next usa `SARM_API_URL` si esta configurada; por defecto apunta a https://sarm-backend.vercel.app. El navegador solo llama rutas /api del propio frontend. Para probar un backend local puedes cambiar esa variable en tu archivo existente a http://127.0.0.1:8000 y reiniciar Next.

Antes de usar, el backend debe estar actualizado a 0.5.0 y Supabase debe tener las migraciones 11, 12 y 13 aplicadas en el proyecto separado sarm-db. Este frontend no requiere nuevas migraciones ni cambios en permisos SQL.

## Funciones

### Usuarios

Se conservan alta de negocio, alta de administrador, alta de operativo, tabla con filtros/paginacion y perfil bajo SARM. Menu Usuarios sigue siendo desplegable.

La tabla ahora incluye acciones por membresia:

- Superadministrador suspende/reactiva administradores y operativos por negocio.
- Administrador solo gestiona operativos de su negocio activo.
- Se pide motivo y confirmacion. La accion llama PATCH /usuarios/{id}/estado y actualiza la tabla al completarse.
- No se muestran acciones sobre superadministrador o cuenta propia. Un bloqueo global o negocio suspendido se indica sin presentar una accion que no puede resolverlo.
- Las membresias de multiples negocios tienen acciones independientes. Se cambia estado_membresia del negocio elegido, no la identidad de Auth.

### Ganado

Menu Ganado para superadministrador y usuario operativo; administrador mantiene su funcion de gestion de cuentas y no ve ni puede abrir este modulo.

El selector muestra negocios activos: todos para superadministrador, solo los autorizados para operativo. El negocio elegido permanece en el parametro `negocio` de la URL. Cambiar de negocio reinicia el contenido y formularios para no mezclar capturas. Un negocio solicitado fuera del alcance no se sustituye silenciosamente: se pide elegir uno autorizado.

- /ganado/animales: listado paginado, busqueda por identificacion/nombre y filtros de sexo/estado.
- /ganado/animales/nuevo: crear ficha, datos basicos, categoria, nacimiento estimado, procedencia y genealogia opcional.
- /ganado/animales/{id}: consultar ficha y corregir campos con motivo. Especie/negocio no se editan.
- Progenitores registrados: busqueda paginada de hasta 20 coincidencias por sexo/especie y seleccion en el mismo negocio. Se pueden usar datos externos o dejar desconocidos.
- /ganado/hatos: crear/editar grupos y cambiar entre activo/archivado.
- /ganado/ubicaciones: crear/editar potreros, corrales, establos u otros lugares y archivar/reactivar.
- Expediente: asignar/mover hato y ubicacion con fecha y motivo; consultar historial.
- Expediente: registrar baja por venta/muerte/otro, consultar bajas y anular una captura equivocada con motivo.

No hay borrado fisico. El backend valida que las relaciones sean del mismo negocio, fechas coherentes, destinos activos y bajas no duplicadas. La interfaz muestra los errores recibidos y conserva el formulario para corregirlos. Para anular una baja con hato/lugar archivado, reactivar primero ese catalogo.

Al crear un animal no se intenta asignarlo automaticamente: la ficha se guarda y se abre el expediente; la asignacion posterior es una operacion independiente. Esto evita que una asignacion fallida oculte una ficha ya creada. Los movimientos envian siempre ambos destinos; elegir "Sin hato" o "Sin ubicacion" desasigna.

La primera entrega habilita bovinos. Los catalogos se consultan al backend; no se inventan IDs, razas, animales ni negocios en la aplicacion. Los catalogos de formularios se recorren por paginas para no truncarlos a los primeros 100 registros. Reproduccion, produccion, sanidad e indicadores no se incluyen todavia.

## Conexion y seguridad

Cookie de sesion HttpOnly, Secure en produccion y SameSite=Lax. Tokens nunca se devuelven al JavaScript del navegador; no se usan claves Supabase en el frontend. El perfil se verifica contra el backend para cada peticion del proxy.

El proxy tiene una lista cerrada de rutas/metodos, valida identificadores y filtros y protege POST/PATCH con comprobacion de origen y JSON. El operativo solo puede solicitar ganado de membresias activas y negocios activos. El administrador no accede a ganado aunque intente llamar la ruta manualmente. La autorizacion final permanece en FastAPI/PostgreSQL.

Una respuesta 403 al verificar /auth/me se trata como sesion sin acceso y lleva al login en la siguiente peticion de la interfaz. Un 403 de una operacion concreta muestra el error sin confundirlo con expiracion de sesion. Si el usuario conserva acceso a otro negocio, puede seguir trabajando en el permitido. No hay renovacion automatica de tokens en esta entrega.

## Verificacion

```powershell
npm run build
npm run typecheck
npm test
```

`npm test` requiere el build previo. Levanta una API local simulada y el frontend de produccion en puerto 3107; no usa cuentas reales ni modifica Supabase. Comprueba 76 casos: login/cookies, roles, rutas directas, filtros, aislamiento, estado de cuentas, contratos PATCH/POST, catalogos, expediente, movimientos, bajas/anulacion y sesion suspendida.

Tambien se verificaron flujos en navegador de escritorio y movil con datos simulados: crear/corregir animal, alta de hato/ubicacion, movimiento/historial, baja/anulacion, suspension/reactivacion, menu y aislamiento por rol. La API publica desplegada reporto version 0.5.0 y los endpoints esperados al revisar su OpenAPI; no se usaron credenciales reales para modificar produccion.

## Publicar tus cambios

Esta entrega se preparo localmente a partir del repositorio consultado. No cambia la rama main remota ni despliega Vercel por si sola. Despues de copiar y probar:

```powershell
git add .
git commit -m "Conecta gestion de accesos y modulo de ganado"
git push origin main
```

Conservar en Vercel la variable SARM_API_URL del backend, si ya existe. No es necesario agregar claves Supabase al frontend.

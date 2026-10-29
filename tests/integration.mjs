import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const business = id(10),
  otherBusiness = id(11);
const requests = [];
let listFailure = false;
const roles = ["superadministrador", "administrador", "usuario"];
const identity = (role) => ({
  id: id(roles.indexOf(role) + 1),
  nombre_usuario: role,
  nombre: "Cuenta",
  apellido_paterno: "Prueba",
  rol: role,
  bloqueo_global: false,
  negocios:
    role === "superadministrador"
      ? []
      : [
          {
            negocio_id: business,
            estado_membresia: "activo",
            nombre_negocio: "Rancho A",
            estado_registro: "activo",
          },
        ],
});
const fixture = createServer(async (request, response) => {
  let text = "";
  for await (const chunk of request) text += chunk;
  const data = text ? JSON.parse(text) : null;
  const url = new URL(request.url, "http://fixture");
  const role = request.headers.authorization?.replace("Bearer ", "");
  requests.push({ path: request.url, method: request.method, data, role });
  const send = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (url.pathname === "/auth/login")
    return data?.password === "fixture-password"
      ? send(200, {
          access_token: data.nombre_usuario,
          expires_in: 3600,
          refresh_token: "never-return-to-browser",
        })
      : send(401, { detail: "Credenciales incorrectas" });
  if (url.pathname === "/auth/me")
    return roles.includes(role)
      ? send(200, identity(role))
      : send(401, { detail: "Token inválido" });
  if (url.pathname === "/inicio/resumen") {
    const common = { actualizado_en: "2026-10-29T00:00:00Z" };
    if (role === "superadministrador")
      return send(200, {
        ...common,
        tipo: role,
        negocio: null,
        negocios: { total: 3, activos: 2, suspendidos: 1 },
        usuarios: {
          total: 8,
          activos: 6,
          suspendidos: 2,
          superadministradores: 1,
          administradores: 2,
          operativos: 5,
        },
      });
    if (role === "administrador")
      return send(200, {
        ...common,
        tipo: role,
        negocio: { id: business, nombre: "Rancho A" },
        usuarios: { total: 5, activos: 3, suspendidos: 2 },
      });
    if (role === "usuario" && url.searchParams.get("negocio_id") === business)
      return send(200, {
        ...common,
        tipo: role,
        negocio: { id: business, nombre: "Rancho A" },
        inventario: {
          total: 125,
          activos: 120,
          bajas: 5,
          hembras_activas: 100,
          machos_activos: 20,
          sin_categoria: 10,
          sin_hato: 15,
          sin_ubicacion: 20,
        },
        categorias: [
          { id: id(40), nombre: "Vaca", total: 100 },
          { id: id(41), nombre: "Toro", total: 10 },
          { id: null, nombre: "Sin categoria", total: 10 },
        ],
        hatos: [
          { id: id(50), nombre: "Grupo A", total: 105 },
          { id: null, nombre: "Sin hato", total: 15 },
        ],
        ubicaciones: [
          { id: id(60), nombre: "Corral A", total: 100 },
          { id: null, nombre: "Sin ubicacion", total: 20 },
        ],
        recientes: [
          {
            id: id(100),
            identificacion: "AN-100",
            nombre: "Luna",
            sexo: "hembra",
            estado_registro: "activo",
            fecha_incorporacion: "2026-10-29",
            creado_en: "2026-10-29T00:00:00Z",
          },
        ],
      });
    return send(403, { detail: "Negocio no autorizado" });
  }
  if (
    /^\/usuarios\/[^/]+\/estado$/.test(url.pathname) &&
    request.method === "PATCH"
  )
    return send(200, {
      usuario_id: url.pathname.split("/")[2],
      negocio_id: data.negocio_id,
      estado_membresia: data.estado,
      cambiado: true,
    });
  if (
    /^\/negocios\/[^/]+\/animales$/.test(url.pathname) &&
    request.method === "GET"
  )
    return send(200, {
      items: [],
      total: 0,
      pagina: 1,
      tamano_pagina: 20,
      total_paginas: 0,
    });
  if (url.pathname === "/usuarios" && request.method === "GET") {
    if (listFailure) return send(404, { detail: "Not Found" });
    const member = {
      negocio_id: business,
      nombre: "Rancho A",
      estado_membresia: "activo",
      estado_negocio: "activo",
    };
    let users = [
      {
        ...identity("superadministrador"),
        nombre_completo: "Cuenta Prueba",
        estado: "activo",
        creado_en: "2026-01-01T00:00:00Z",
        negocios: [],
      },
      {
        ...identity("usuario"),
        nombre_completo: "Roberto Prueba",
        estado: "activo",
        creado_en: "2026-01-01T00:00:00Z",
        negocios: [member],
      },
    ];
    if (role === "administrador")
      users = users.filter(
        (u) => u.rol === "usuario" && u.id !== identity(role).id,
      );
    const q = url.searchParams.get("q")?.toLowerCase();
    if (q)
      users = users.filter((u) =>
        (u.nombre_usuario + " " + u.nombre_completo).toLowerCase().includes(q),
      );
    const rol = url.searchParams.get("rol");
    if (rol) users = users.filter((u) => u.rol === rol);
    const biz = url.searchParams.get("negocio_id");
    if (biz)
      users = users.filter((u) => u.negocios.some((n) => n.negocio_id === biz));
    const state = url.searchParams.get("estado");
    if (state) users = users.filter((u) => u.estado === state);
    const page = Number(url.searchParams.get("pagina") || 1),
      size = Number(url.searchParams.get("tamano_pagina") || 20);
    return send(200, {
      items: users.slice((page - 1) * size, page * size),
      total: users.length,
      pagina: page,
      tamano_pagina: size,
      total_paginas: Math.ceil(users.length / size),
    });
  }
  if (url.pathname === "/negocios" && request.method === "GET")
    return send(200, [
      { id: business, nombre: "Rancho A", estado_registro: "activo" },
      ...(role === "superadministrador"
        ? [{ id: otherBusiness, nombre: "Rancho B", estado_registro: "activo" }]
        : []),
    ]);
  if (
    ["/usuarios", "/administradores", "/negocios"].includes(url.pathname) &&
    request.method === "POST"
  )
    return send(201, { id: id(20), estado: "creado" });
  if (url.pathname === "/catalogos/estados")
    return send(200, [{ id: 30, nombre: "Veracruz" }]);
  if (
    url.pathname === "/catalogos/municipios" &&
    url.searchParams.get("estado_id") === "30"
  )
    return send(200, [{ id: 1, nombre: "Xalapa" }]);
  send(404, { detail: "Not Found" });
});
fixture.listen(0, "127.0.0.1");
await once(fixture, "listening");
const frontendPort = Number(process.env.TEST_PORT || 3107),
  base = `http://127.0.0.1:${frontendPort}`;
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "-p",
    String(frontendPort),
    "-H",
    "127.0.0.1",
  ],
  {
    env: {
      ...process.env,
      SARM_API_URL: `http://127.0.0.1:${fixture.address().port}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
child.stdout.on("data", (c) => (output += c));
child.stderr.on("data", (c) => (output += c));
const call = (path, options = {}) =>
  fetch(base + path, {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
const auth = (role = "superadministrador") => ({
  headers: { Cookie: `sarm_access_token=${role}` },
});
const mutation = (body, role = "superadministrador") => ({
  method: "POST",
  headers: {
    Origin: base,
    "Content-Type": "application/json",
    Cookie: `sarm_access_token=${role}`,
  },
  body: JSON.stringify(body),
});
let count = 0;
function check(value, label) {
  assert.ok(value, label);
  console.log("OK", ++count, label);
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await call("/login")).status === 200) {
        ready = true;
        break;
      }
    } catch {}
    if (child.exitCode !== null) break;
    await delay(100);
  }
  assert.ok(ready, output);
  check((await call("/")).status === 307, "Sin sesión redirige a login");
  check(
    (await call("/api/sarm/usuarios")).status === 401,
    "Listado sin sesión rechazado",
  );
  check(
    (
      await call(
        "/api/auth/login",
        mutation({ nombre_usuario: "superadministrador", password: "wrong" }),
      )
    ).status === 401,
    "Credenciales inválidas rechazadas",
  );
  const login = await call(
      "/api/auth/login",
      mutation({
        nombre_usuario: "superadministrador",
        password: "fixture-password",
      }),
    ),
    body = await login.json(),
    cookie = login.headers.get("set-cookie") || "";
  check(
    login.status === 200 &&
      body.ok &&
      !body.access_token &&
      !body.refresh_token,
    "Login no expone tokens",
  );
  check(
    cookie.includes("HttpOnly") &&
      cookie.includes("Secure") &&
      cookie.includes("SameSite=lax"),
    "Cookie protegida",
  );
  check(
    (await call("/", auth())).headers.get("location") === "/inicio",
    "Superadmin entra a Inicio",
  );
  check(
    (await call("/", auth("usuario"))).headers.get("location") === "/inicio",
    "Operativo entra a bienvenida",
  );
  const superHtml = await (await call("/usuarios", auth())).text();
  check(
    superHtml.includes("Gestionar usuarios") &&
      superHtml.includes('href="/negocios/nuevo"') &&
      superHtml.includes('href="/administradores/nuevo"'),
    "Menú completo para superadmin",
  );
  check(
    superHtml.includes("Abrir información de mi perfil") &&
      superHtml.includes("<details") &&
      superHtml.includes("Nombre de usuario"),
    "Panel de perfil debajo de SARM",
  );
  const adminHtml = await (
    await call("/usuarios", auth("administrador"))
  ).text();
  check(
    adminHtml.includes('href="/usuarios/nuevo"') &&
      !adminHtml.includes('href="/negocios/nuevo"') &&
      !adminHtml.includes('href="/administradores/nuevo"'),
    "Administrador solo tiene tareas permitidas",
  );
  const operativeHtml = await (await call("/inicio", auth("usuario"))).text();
  check(
    !operativeHtml.includes('href="/usuarios"') &&
      !operativeHtml.includes('href="/usuarios/nuevo"') &&
      operativeHtml.includes("Hola,"),
    "Operativo sin menú Usuarios",
  );
  for (const path of [
    "/usuarios",
    "/usuarios/nuevo",
    "/administradores/nuevo",
    "/negocios/nuevo",
  ]) {
    const r = await call(path, auth("usuario"));
    check(
      r.status === 307 && r.headers.get("location") === "/inicio",
      `Operativo no abre ${path}`,
    );
  }
  for (const path of ["/administradores/nuevo", "/negocios/nuevo"])
    check(
      (await call(path, auth("administrador"))).headers.get("location") ===
        "/inicio",
      `Administrador no abre ${path}`,
    );
  const superList = await (await call("/api/sarm/usuarios", auth())).json();
  check(
    superList.total === 2 &&
      superList.items.some((u) => u.rol === "superadministrador"),
    "Superadmin ve su propia cuenta",
  );
  const adminList = await (
    await call("/api/sarm/usuarios", auth("administrador"))
  ).json();
  check(
    adminList.total === 1 &&
      adminList.items.every((u) => u.rol === "usuario" && u.id !== id(2)),
    "Administrador recibe solo operativos",
  );
  const adminRequest = new URL(
    requests
      .filter(
        (r) =>
          r.method === "GET" &&
          r.path.startsWith("/usuarios") &&
          r.role === "administrador",
      )
      .at(-1).path,
    "http://fixture",
  );
  check(
    adminRequest.searchParams.get("negocio_id") === business &&
      adminRequest.searchParams.get("rol") === "usuario",
    "Proxy fuerza negocio propio y rol operativo",
  );
  check(
    (
      await call(
        `/api/sarm/usuarios?negocio_id=${otherBusiness}`,
        auth("administrador"),
      )
    ).status === 403,
    "Administrador no cambia negocio",
  );
  check(
    (
      await call(
        "/api/sarm/usuarios?rol=superadministrador",
        auth("administrador"),
      )
    ).status === 403,
    "Administrador no solicita superadmins",
  );
  check(
    (await call("/api/sarm/usuarios", auth("usuario"))).status === 403,
    "Operativo recibe 403 en API",
  );
  const filtered = await (
    await call(
      `/api/sarm/usuarios?q=Roberto&rol=usuario&negocio_id=${business}&estado=activo&pagina=1&tamano_pagina=1`,
      auth(),
    )
  ).json();
  check(
    filtered.total === 1 &&
      filtered.items[0].nombre_completo === "Roberto Prueba" &&
      filtered.tamano_pagina === 1,
    "Filtros y paginación llegan al backend",
  );
  const second = await (
    await call("/api/sarm/usuarios?pagina=2&tamano_pagina=1", auth())
  ).json();
  check(
    second.items.length === 1 && second.pagina === 2 && second.total === 2,
    "Segunda página",
  );
  for (const query of [
    "pagina=0",
    "tamano_pagina=101",
    "rol=root",
    "estado=borrado",
    "negocio_id=no-uuid",
    "q=a&q=b",
    "actor=suplantado",
    "q=" + encodeURIComponent("a".repeat(101)),
  ])
    check(
      (await call("/api/sarm/usuarios?" + query, auth())).status === 400,
      `Filtro inválido rechazado: ${query.slice(0, 40)}`,
    );
  const literal = "O'Brien,%_";
  await call("/api/sarm/usuarios?q=" + encodeURIComponent(literal), auth());
  const last = new URL(
    requests.filter((r) => r.path.startsWith("/usuarios?")).at(-1).path,
    "http://fixture",
  );
  check(
    last.searchParams.get("q") === literal,
    "Búsqueda conserva caracteres como valores",
  );
  check(
    (await call("/api/sarm/usuarios", mutation({ nombre_usuario: "test" })))
      .status === 201,
    "Alta de usuario conservada",
  );
  check(
    (await call("/api/sarm/administradores", mutation({}))).status === 201,
    "Alta de administrador conservada",
  );
  check(
    (await call("/api/sarm/negocios", mutation({}))).status === 201,
    "Alta de negocio conservada",
  );
  check(
    (await call("/api/sarm/administradores", mutation({}, "administrador")))
      .status === 403,
    "Administrador no crea administradores",
  );
  const csrf = mutation({});
  csrf.headers.Origin = "https://otro.example";
  check(
    (await call("/api/sarm/usuarios", csrf)).status === 403,
    "Otro origen rechazado",
  );
  check(
    (await call("/api/sarm/auth/login", mutation({}))).status === 404,
    "Proxy limita rutas",
  );
  listFailure = true;
  const missing = await call("/api/sarm/usuarios", auth());
  check(
    missing.status === 503 &&
      (await missing.text()).includes("backend actualizado"),
    "Mensaje útil si backend no tiene listado",
  );
  listFailure = false;
  const logout = await call("/api/auth/logout", mutation({}));
  check(
    logout.status === 200 &&
      (logout.headers.get("set-cookie") || "").includes("sarm_access_token=;"),
    "Cierre elimina cookie",
  );
  const globalSummary = await (
    await call("/api/sarm/inicio/resumen", auth())
  ).json();
  check(
    globalSummary.tipo === "superadministrador" &&
      globalSummary.negocios.total === 3,
    "Resumen global por rol",
  );
  const adminSummary = await (
    await call("/api/sarm/inicio/resumen", auth("administrador"))
  ).json();
  check(
    adminSummary.tipo === "administrador" && !adminSummary.inventario,
    "Admin sin informacion ganadera",
  );
  const lastSummary = requests
    .filter((r) => r.path.startsWith("/inicio/resumen"))
    .at(-1);
  check(
    new URL(lastSummary.path, "http://fixture").searchParams.get(
      "negocio_id",
    ) === business,
    "Proxy aplica negocio propio al admin",
  );
  check(
    (
      await call(
        `/api/sarm/inicio/resumen?negocio_id=${otherBusiness}`,
        auth("administrador"),
      )
    ).status === 403,
    "Admin no cambia alcance del resumen",
  );
  check(
    (await call("/api/sarm/inicio/resumen", auth("usuario"))).status === 400,
    "Operativo necesita negocio",
  );
  check(
    (
      await call(
        `/api/sarm/inicio/resumen?negocio_id=${otherBusiness}`,
        auth("usuario"),
      )
    ).status === 403,
    "Operativo no consulta resumen ajeno",
  );
  const ranch = await (
    await call(
      `/api/sarm/inicio/resumen?negocio_id=${business}`,
      auth("usuario"),
    )
  ).json();
  check(
    ranch.inventario.total === 125 && ranch.recientes.length === 1,
    "Total completo independiente de lista reciente",
  );
  for (const q of [
    "p_actor=spoof",
    "rol=superadministrador",
    "negocio_id=no-uuid",
    `negocio_id=${business}&negocio_id=${otherBusiness}`,
  ])
    check(
      (await call("/api/sarm/inicio/resumen?" + q, auth("usuario"))).status ===
        400,
      "Resumen rechaza filtro: " + q,
    );
  check(
    (await call(`/api/sarm/inicio/resumen?negocio_id=${business}`, auth()))
      .status === 400,
    "Superadmin no envia un negocio ignorado",
  );
  check(
    (await call("/api/sarm/inicio/resumen")).status === 401,
    "Resumen sin sesion rechazado",
  );
  for (const role of roles) {
    check(
      (await call("/inicio", auth(role))).status === 200,
      "Inicio disponible para " + role,
    );
    check(
      (await call("/reportes", auth(role))).status === 200,
      "Reportes disponible para " + role,
    );
  }
  check(
    (await call(`/api/sarm/negocios/${business}/animales`, auth("usuario")))
      .status === 200,
    "Proxy conserva ganado del operativo",
  );
  check(
    (
      await call(
        `/api/sarm/negocios/${business}/animales`,
        auth("administrador"),
      )
    ).status === 403,
    "Admin sigue sin ganado",
  );
  check(
    (
      await call(`/api/sarm/usuarios/${id(3)}/estado`, {
        ...mutation({ estado: "activo", motivo: "Prueba" }, "administrador"),
        method: "PATCH",
      })
    ).status === 200,
    "Proxy conserva reactivacion de usuarios",
  );
  const { readFile } = await import("node:fs/promises");
  const ts = (await import("typescript")).default;
  const csvCode = ts.transpileModule(
    await readFile(new URL("../lib/summary-csv.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const { summaryCsv, csvCell } = await import(
    "data:text/javascript;base64," + Buffer.from(csvCode).toString("base64")
  );
  check(
    csvCell('=HYPERLINK("x")').startsWith("\"'"),
    "CSV neutraliza formulas",
  );
  check(
    csvCell(" +SUM(1)").startsWith("\"'"),
    "CSV neutraliza formulas con espacios",
  );
  const csv = summaryCsv(ranch);
  check(
    csv.startsWith("\uFEFF") && csv.includes('"Animales registrados","125"'),
    "CSV incluye total completo y UTF-8 BOM",
  );
  check(
    csv.includes('"Hatos (activos)","Grupo A","105"'),
    "CSV exporta agrupaciones reales",
  );
  console.log(
    `${count} comprobaciones aprobadas con API simulada. Sin cambios en Supabase.`,
  );
  if (process.env.SARM_BROWSER_QA === "1") {
    console.log("BROWSER_READY", base);
    await new Promise((resolve) => process.once("SIGTERM", resolve));
  }
} catch (error) {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  fixture.closeAllConnections();
  fixture.close();
}

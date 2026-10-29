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
let accessBlocked = false;
let memberState = "activo";
let serial = 100;
const specie = {
  id: id(30),
  codigo: "bovino",
  nombre: "Bovino",
  habilitada: true,
};
const herds = [],
  places = [],
  animals = [],
  moves = [],
  withdrawals = [];
const stamp = "2026-10-29T00:00:00Z";
const pageOf = (items, url) => {
  const pagina = Number(url.searchParams.get("pagina") || 1),
    size = Number(url.searchParams.get("tamano_pagina") || 20);
  return {
    items: items.slice((pagina - 1) * size, pagina * size),
    total: items.length,
    pagina,
    tamano_pagina: size,
    total_paginas: Math.ceil(items.length / size),
  };
};

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
      ? accessBlocked && role === "usuario"
        ? send(403, { detail: "Cuenta sin acceso activo" })
        : send(200, identity(role))
      : send(401, { detail: "Token inválido" });
  const statusMatch = url.pathname.match(/^\/usuarios\/([^/]+)\/estado$/);
  if (statusMatch && request.method === "PATCH") {
    if (statusMatch[1] === id(3)) memberState = data.estado;
    return send(200, {
      usuario_id: statusMatch[1],
      negocio_id: data.negocio_id,
      estado_membresia: data.estado,
      cambiado: true,
    });
  }
  const ganado = url.pathname.match(
    /^\/negocios\/([^/]+)\/(animales|hatos|ubicaciones-ganaderas|especies-animales|categorias-animales|bajas-animales)(?:\/([^/]+))?(?:\/(movimientos|bajas|anular))?$/,
  );
  if (ganado) {
    const [, biz, resource, record, action] = ganado;
    if (role === "administrador" || (role === "usuario" && biz !== business))
      return send(403, { detail: "Negocio no autorizado" });
    if (resource === "especies-animales")
      return send(200, pageOf([specie], url));
    if (resource === "categorias-animales")
      return send(
        200,
        pageOf(
          [
            {
              id: id(31),
              especie_id: specie.id,
              codigo: "vaca",
              nombre: "Vaca",
              sexo: "hembra",
            },
            {
              id: id(32),
              especie_id: specie.id,
              codigo: "toro",
              nombre: "Toro",
              sexo: "macho",
            },
          ],
          url,
        ),
      );
    if (resource === "bajas-animales" && action === "anular") {
      const baja = withdrawals.find(
        (b) => b.id === record && b.negocio_id === biz,
      );
      if (!baja) return send(404, { detail: "Baja no encontrada" });
      baja.anulada_en = stamp;
      baja.motivo_anulacion = data.motivo;
      const animal = animals.find((a) => a.id === baja.animal_id);
      animal.estado_registro = "activo";
      return send(200, animal);
    }
    if (resource === "animales" && action) {
      const animal = animals.find(
        (a) => a.id === record && a.negocio_id === biz,
      );
      if (!animal) return send(404, { detail: "Animal no encontrado" });
      const rows = action === "movimientos" ? moves : withdrawals;
      if (request.method === "GET")
        return send(
          200,
          pageOf(
            rows.filter((r) => r.animal_id === record),
            url,
          ),
        );
      if (action === "movimientos") {
        const row = {
          id: id(serial++),
          negocio_id: biz,
          animal_id: record,
          fecha: data.fecha,
          motivo: data.motivo,
          hato_origen_id: animal.hato_id,
          hato_destino_id: data.hato_id,
          ubicacion_origen_id: animal.ubicacion_ganadera_id,
          ubicacion_destino_id: data.ubicacion_ganadera_id,
          creado_en: stamp,
        };
        moves.push(row);
        animal.hato_id = data.hato_id;
        animal.ubicacion_ganadera_id = data.ubicacion_ganadera_id;
        return send(201, row);
      }
      if (animal.estado_registro === "baja")
        return send(422, { detail: "Animal ya dado de baja" });
      const row = {
        id: id(serial++),
        negocio_id: biz,
        animal_id: record,
        fecha: data.fecha,
        motivo: data.motivo,
        observaciones: data.observaciones,
        anulada_en: null,
        motivo_anulacion: null,
      };
      withdrawals.push(row);
      animal.estado_registro = "baja";
      return send(201, row);
    }
    const rows =
      resource === "animales" ? animals : resource === "hatos" ? herds : places;
    if (request.method === "GET") {
      if (record)
        return send(
          rows.some((r) => r.id === record && r.negocio_id === biz) ? 200 : 404,
          rows.find((r) => r.id === record && r.negocio_id === biz) || {
            detail: "No encontrado",
          },
        );
      let filtered = rows.filter((r) => r.negocio_id === biz);
      for (const key of [
        "sexo",
        "estado_registro",
        "especie_id",
        "categoria_id",
        "hato_id",
        "ubicacion_ganadera_id",
      ])
        if (url.searchParams.has(key))
          filtered = filtered.filter(
            (r) => r[key] === url.searchParams.get(key),
          );
      if (url.searchParams.get("q"))
        filtered = filtered.filter((r) =>
          [r.nombre, r.identificacion]
            .join(" ")
            .toLowerCase()
            .includes(url.searchParams.get("q").toLowerCase()),
        );
      return send(200, pageOf(filtered, url));
    }
    if (request.method === "PATCH") {
      const row = rows.find((r) => r.id === record && r.negocio_id === biz);
      if (!row) return send(404, { detail: "No encontrado" });
      const { motivo, ...changes } = data;
      Object.assign(row, changes);
      return send(200, row);
    }
    const row =
      resource === "animales"
        ? {
            id: id(serial++),
            negocio_id: biz,
            nombre: null,
            categoria_id: null,
            tipo_racial: null,
            procedencia: null,
            padre_id: null,
            madre_id: null,
            padre_externo_identificacion: null,
            padre_externo_raza: null,
            madre_externa_identificacion: null,
            madre_externa_raza: null,
            hato_id: null,
            ubicacion_ganadera_id: null,
            nacimiento_estimado: false,
            estado_registro: "activo",
            observaciones: null,
            creado_en: stamp,
            actualizado_en: stamp,
            ...data,
          }
        : {
            id: id(serial++),
            negocio_id: biz,
            descripcion: null,
            estado_registro: "activo",
            ...data,
          };
    rows.push(row);
    return send(201, row);
  }
  if (url.pathname === "/usuarios" && request.method === "GET") {
    if (listFailure) return send(404, { detail: "Not Found" });
    const member = {
      negocio_id: business,
      nombre: "Rancho A",
      estado_membresia: memberState,
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
        estado: memberState,
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
    (await call("/", auth())).headers.get("location") === "/usuarios",
    "Superadmin entra al listado",
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
      operativeHtml.includes("Tu acceso está activo"),
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
  // Nuevos contratos, permisos y rutas para estado de usuarios y ganado.
  const statusOptions = {
    ...mutation({
      negocio_id: business,
      estado: "suspendido",
      motivo: "Prueba",
    }),
    method: "PATCH",
  };
  check(
    (await call(`/api/sarm/usuarios/${id(3)}/estado`, statusOptions)).status ===
      200,
    "Superadmin suspende acceso",
  );
  check(
    requests.at(-1).data.motivo === "Prueba" &&
      requests.at(-1).method === "PATCH",
    "Estado conserva PATCH y motivo",
  );
  check(
    (await call(`/api/sarm/usuarios/${id(1)}/estado`, statusOptions)).status ===
      403,
    "No autosuspension",
  );
  check(
    (
      await call(`/api/sarm/usuarios/${id(3)}/estado`, {
        ...mutation({ estado: "activo", motivo: "Prueba" }, "administrador"),
        method: "PATCH",
      })
    ).status === 200,
    "Administrador infiere negocio para reactivar",
  );
  check(
    requests.at(-1).data.negocio_id === business,
    "Negocio inferido en cuerpo de estado",
  );
  check(
    (
      await call(`/api/sarm/usuarios/${id(3)}/estado`, {
        ...mutation(
          { negocio_id: otherBusiness, estado: "activo", motivo: "Prueba" },
          "administrador",
        ),
        method: "PATCH",
      })
    ).status === 403,
    "Estado no admite negocio ajeno",
  );
  check(
    (
      await call(`/api/sarm/usuarios/${id(3)}/estado`, {
        ...mutation({
          negocio_id: business,
          estado: "activo",
          motivo: "x",
          p_actor: id(1),
        }),
        method: "PATCH",
      })
    ).status === 400,
    "Estado no acepta actor del cliente",
  );
  const wrongPatch = {
    ...statusOptions,
    headers: { ...statusOptions.headers, Origin: "https://ajeno.example" },
  };
  check(
    (await call(`/api/sarm/usuarios/${id(3)}/estado`, wrongPatch)).status ===
      403,
    "PATCH protegido contra otro origen",
  );
  check(
    (await call("/api/sarm/negocios", auth("usuario"))).status === 200,
    "Operativo consulta negocios propios",
  );
  const cattle = `/api/sarm/negocios/${business}`;
  check(
    (await call(cattle + "/animales", auth("administrador"))).status === 403,
    "Administrador no consulta ganado",
  );
  check(
    (
      await call(
        `/api/sarm/negocios/${otherBusiness}/animales`,
        auth("usuario"),
      )
    ).status === 403,
    "Operativo no consulta ganado ajeno",
  );
  check(
    (await call(cattle + "/animales", auth("usuario"))).status === 200,
    "Operativo consulta ganado propio",
  );
  const cattleHtml = await (
    await call("/ganado/animales", auth("usuario"))
  ).text();
  check(
    cattleHtml.includes("Ganado") && !cattleHtml.includes('href="/usuarios"'),
    "Operativo ve ganado sin administracion",
  );
  check(
    (await call("/ganado/animales", auth("administrador"))).headers.get(
      "location",
    ) === "/inicio",
    "Administrador no abre pagina de ganado",
  );
  for (const query of [
    "pagina=0",
    "tamano_pagina=101",
    "sexo=otro",
    "hato_id=mal",
    "p_actor=actor",
    "q=a&q=b",
    "estado_registro=archivado",
  ])
    check(
      (await call(cattle + "/animales?" + query, auth())).status === 400,
      "Filtro ganado invalido: " + query,
    );
  const species = await (
    await call(cattle + "/especies-animales", auth())
  ).json();
  check(species.items[0].id === specie.id, "Catalogo Bovino llega al frontend");
  const animalBody = {
    especie_id: specie.id,
    identificacion: "HTTP-001",
    nombre: "Luna HTTP",
    sexo: "hembra",
    fecha_nacimiento: "2022-01-01",
    fecha_incorporacion: "2026-01-01",
    tipo_incorporacion: "compra",
  };
  const animalResponse = await call(cattle + "/animales", mutation(animalBody));
  const animal = await animalResponse.json();
  check(
    animalResponse.status === 201 && animal.identificacion === "HTTP-001",
    "Crear animal por BFF",
  );
  check(
    (await call(cattle + "/animales/" + animal.id, auth())).status === 200,
    "Consultar expediente",
  );
  const update = await call(cattle + "/animales/" + animal.id, {
    ...mutation({ nombre: "Luna corregida", motivo: "Correccion" }),
    method: "PATCH",
  });
  check(
    update.status === 200 && (await update.json()).nombre === "Luna corregida",
    "Corregir animal por PATCH",
  );
  const herd = await (
    await call(cattle + "/hatos", mutation({ nombre: "Hato HTTP" }))
  ).json();
  const place = await (
    await call(
      cattle + "/ubicaciones-ganaderas",
      mutation({ nombre: "Potrero HTTP", tipo: "potrero" }),
    )
  ).json();
  check(herd.id && place.id, "Crear hato y ubicacion");
  check(
    (
      await call(
        cattle + "/animales/" + animal.id + "/movimientos",
        mutation({
          fecha: "2026-10-29",
          hato_id: herd.id,
          ubicacion_ganadera_id: place.id,
          motivo: "Movimiento",
        }),
      )
    ).status === 201,
    "Mover animal",
  );
  check(
    (
      await (
        await call(cattle + "/animales/" + animal.id + "/movimientos", auth())
      ).json()
    ).total === 1,
    "Historial movimiento",
  );
  const bajaResponse = await call(
    cattle + "/animales/" + animal.id + "/bajas",
    mutation({ fecha: "2026-10-29", motivo: "venta" }),
  );
  const baja = await bajaResponse.json();
  check(bajaResponse.status === 201, "Registrar baja");
  const undo = await call(
    cattle + "/bajas-animales/" + baja.id + "/anular",
    mutation({ motivo: "Baja erronea" }),
  );
  check(
    undo.status === 200 && (await undo.json()).estado_registro === "activo",
    "Anular baja conserva HTTP 200",
  );
  check(
    (
      await call(cattle + "/animales/" + animal.id, {
        ...mutation({}),
        method: "DELETE",
      })
    ).status === 405,
    "No permite borrado fisico",
  );
  check(
    (await call(cattle + "/usuarios", auth())).status === 404,
    "Proxy no abre recursos arbitrarios",
  );
  accessBlocked = true;
  check(
    (await call(cattle + "/animales", auth("usuario"))).status === 401,
    "Cuenta suspendida se trata como sesion sin acceso",
  );
  accessBlocked = false;
  check(
    (await call(cattle + "/animales", auth("usuario"))).status === 200,
    "Reactivacion permite consultar nuevamente",
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

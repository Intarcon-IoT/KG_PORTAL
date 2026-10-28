# KG Portal

Portal interno del grupo KEYTER (Keyter, Intarcon, Genaq, KIO y Kiconex):

- **Reserva de salas de reuniones**: salas, calendario y validación de reservas.
- **Recepción**: control de visitas sobre Odoo. Las llamadas vendrán en un módulo aparte.
- **Roles y permisos por módulo**: deciden qué ve y qué puede hacer cada usuario.

Monorepo con **dos servicios independientes** que se despliegan con PM2.

| | Servicio | Stack | Puerto |
|---|---|---|---|
| `frontend/` | SPA | Vue 3 · Vite 8 · Vuetify 4 · Pinia · Vue Router 5 · Socket.IO client | `3000` dev · `9445` preview |
| `backend/` | API REST + tiempo real | Node 24 · Express 5 · MySQL · Redis · Nodemailer · Socket.IO · Odoo JSON-2 | `PORT` (`.env`, `3445` en local) |

---

## Índice

1. [Arquitectura](#arquitectura)
2. [Requisitos previos](#requisitos-previos)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Configuración](#configuración)
5. [Comandos](#comandos)
6. [Roles y permisos](#roles-y-permisos)
7. [Reservas](#reservas)
8. [Recepción: visitas](#recepción-visitas)
9. [Integraciones](#integraciones)
10. [Base de datos y migraciones](#base-de-datos-y-migraciones)
11. [Convenciones del proyecto](#convenciones-del-proyecto)
12. [Calidad y dependencias](#calidad-y-dependencias)
13. [Producción](#producción)
14. [Troubleshooting](#troubleshooting)
15. [Documentación](#documentación)

---

## Arquitectura

```text
   ┌──────────────┐                        ┌───────────────────┐
   │   frontend   │  Vue 3 · Vuetify 4     │ pantallas de sala │  GET /api/v0/rooms/:uuid
   │  :3000 / SPA │  Pinia · Router 5      │ (api_token sala)  │  reunión actual y siguiente
   └──────┬───────┘                        └─────────┬─────────┘
          │ HTTP: Authorization: Basic <token>       │ Authorization: <api_token>
          │ WebSocket: /api/socket.io                │
          └─────────────────────┬────────────────────┘
                         ┌──────▼───────┐
                         │   backend    │  Express 5 bajo /api · Socket.IO
                         │              │  Winston · Nodemailer
                         └─┬────┬────┬──┘
          ┌────────────────┘    │    └────────────────┐
  ┌───────▼──────┐      ┌───────▼──────┐      ┌───────▼──────┐
  │    MySQL     │      │    Redis     │      │   Odoo 19    │
  │  kg_portal   │      │   sesiones   │      │  JSON-2 API  │
  └──────────────┘      └──────────────┘      └──────────────┘
```

**Cómo se comunican:**
- El frontend solo habla con `backend/api/*`, por HTTP y por un WebSocket para los avisos en tiempo real.
- Las sesiones viven en Redis y los datos del portal en MySQL. Los correos salen por SMTP.
- Las visitas viven en Odoo: el backend las lee y escribe con su API JSON-2.

### Estructura

```text
KG_PORTAL/
├── backend/                 API Express 5
│   ├── migrations/          db-migrate
│   └── src/
│       ├── index.js         monta app.js bajo /api
│       ├── app.js           cabeceras CORS, body parsers y rutas
│       ├── routes/          rooms · facilities · users · roles · tenants · bookings · reception · system · password-reset
│       │   └── v0/          API de las pantallas de sala
│       ├── controllers/     lógica y respuesta HTTP por dominio
│       ├── models/          clases con SQL raw (role, grants = permisos; Legacy/ = modelo de las pantallas)
│       ├── middlewares/     sesión, Admin, permisos (can) y token de sala
│       ├── connections/     pool MySQL, transporte SMTP y cliente de Odoo
│       ├── socket/          Socket.IO: salas por usuario y por módulo
│       └── utils/           mysqlAdapter · cacheAdapter · permissions (catálogo) · odooAdapter · visitsOdoo · health
│           └── emailTemplates/  alta de usuario, contraseña y estado de reserva
├── frontend/                SPA Vue 3 + Vite
│   └── src/
│       ├── views/           pantallas por ruta (calendario, validación, recepción, usuarios, roles, login)
│       ├── components/      calendario, recepción, formularios (permisos), modales y listas
│       ├── store/           stores de Pinia (sesión, acceso, socket, reservas, salas, sincronización…)
│       ├── model/           Request (cliente HTTP), Auth (sesión) y visitas
│       ├── utils/           permisos (can/canAny), fechas y visitas
│       └── router/          rutas y guards por permiso
├── scripts/                 orquestación del monorepo (lint, deploy, clean)
├── docs/                    toda la documentación .md
└── ecosystem.config.js      PM2 (producción)
```

---

## Requisitos previos

### Herramientas

| Herramienta | Versión | Nota |
|---|---|---|
| **Node.js** | **24.x** | |
| **pnpm** | **12.14.0** | Fijado en `packageManager`. **No usar npm ni yarn** |

Con [Corepack](https://nodejs.org/api/corepack.html) activo, pnpm se ajusta solo a la versión de
`packageManager`. Si no:

```bash
npm install -g pnpm@12.14.0
```

### Servicios externos

Nada de esto arranca con el repo; hay que tenerlo accesible:

- **MySQL**: base de datos `kg_portal`.
- **Redis**: sesiones de usuario y enlaces de recuperación de contraseña.
- **SMTP**: correos de alta de usuario, recuperación de contraseña y estado de las reservas.
- **Odoo 19** (opcional): datos del módulo de Recepción. En local, **siempre el Odoo de pruebas**,
  porque las visitas envían correos de verdad.

Sin MySQL el backend **no arranca**, porque comprueba la conexión al iniciar. Sin Redis arranca, pero
nadie puede iniciar sesión. Sin Odoo el portal funciona, pero el módulo de Visitas da error al cargar.

---

## Puesta en marcha

### 1. Instalar

```bash
pnpm run install:all
```

### 2. Crear la configuración local

Cuatro ficheros a partir de sus plantillas. Ninguno se versiona.

**Linux / macOS:**

```bash
cp backend/.env.sample backend/.env && cp backend/database.json.sample backend/database.json && cp frontend/.env.sample frontend/.env
```

**Windows PowerShell:**

```powershell
Copy-Item backend\.env.sample backend\.env; Copy-Item backend\database.json.sample backend\database.json; Copy-Item frontend\.env.sample frontend\.env
```

Rellénalos con lo de [Configuración](#configuración).

### 3. Migrar la base de datos

```bash
cd backend && pnpm run migrate
```

### 4. Arrancar

Dos terminales:

```bash
cd backend && pnpm run dev
```

```bash
cd frontend && pnpm run start
```

El frontend queda en `http://localhost:3000`. Los usuarios se dan de alta en **Administración ›
Usuarios** (Admin, o quien tenga el permiso «Usuarios: crear, editar y deshabilitar»); la contraseña
inicial llega por correo.

> En local el SMTP es el real y la base de desarrollo tiene usuarios reales: aprobar o rechazar
> reservas ajenas, crear usuarios o recuperar contraseñas **envía correos de verdad**.

---

## Configuración

### `backend/.env`

| Clave | Para qué |
|---|---|
| `PORT` | Puerto de la API: `3445`. Client360 usa `3443` e IntarLAB `3444` |
| `FRONTEND_CLIENT` | Origen permitido en `Access-Control-Allow-Origin` |
| `DB_HOST` · `DB_USER` · `DB_PASS` · `DB_DATABASE` | MySQL |
| `REDIS_HOST` · `REDIS_PORT` · `REDIS_USER` · `REDIS_PASS` | Redis. Usuario y contraseña de su ACL; vacíos si no tiene (local) |
| `SECRET_KEY_CACHE` | Prefijo de las claves de Redis (`kg_portal`), distinto del de los demás proyectos porque Redis es compartido. **Cambiarlo cierra todas las sesiones** |
| `APP_URL` | URL pública del frontend, para los enlaces de los correos |
| `SMTP_HOST` · `SMTP_PORT` · `SMTP_SECURE` · `SMTP_USER` · `SMTP_PASS` · `SMTP_FROM` | Envío de correo: `smtp.intarcon.es`, `465`, `true` (como texto). `SMTP_FROM` debe ser el buzón de `SMTP_USER` |
| `ODOO_HOST` · `ODOO_DB` · `ODOO_API_KEY` | Odoo 19 por JSON-2 (Recepción). De `ODOO_HOST` solo se usa el origen (`https://servidor`). Sin ellas, Recepción no está disponible |
| `ODOO_COMPANY_ID` · `ODOO_TIMEOUT_MS` | Compañía de Odoo con la que se trabaja (`1`) y tiempo máximo por llamada (`30000`) |

### `backend/database.json`

Conexión de `db-migrate` (entorno `dev`). No lleva credenciales: las lee del `.env` con `{ "ENV": "DB_HOST" }`, así que basta con copiar la plantilla.

### `frontend/.env`

| Clave | Para qué |
|---|---|
| `VITE_API_URL` | URL base del backend **con `/api/` al final** (`http://localhost:3445/api/`) |

> **Los ficheros de configuración nunca se suben.** Si añades una clave, añádela también a su
> `.sample` con el nombre como valor.

---

## Comandos

### Raíz — orquestan el monorepo

```bash
pnpm run lint          # ESLint de backend y frontend (corre los dos; sale 1 si alguno falla)
pnpm run install:all   # pnpm install en backend y frontend
pnpm run deploy        # deploy del backend y, si va bien, del frontend
pnpm run clean         # borra node_modules, builds, cachés y logs (NO los lockfiles) y lanza el deploy
pnpm run bump-version  # sube la versión de VERSION (AAAA.MM.N); con --dry solo la muestra
```

La versión del portal está solo en el fichero `VERSION` de la raíz: el backend la sirve en
`GET /api/system/version` y el frontend la incrusta al compilar. Súbela con `bump-version` en cada entrega.

`deploy` es también un comando propio de pnpm: lánzalo siempre como `pnpm run deploy`, nunca
`pnpm deploy`. La lógica está en `scripts/*.js`.

> `deploy` **no reinicia procesos**. En producción hace falta `pm2 reload` después.

### Backend

```bash
pnpm run dev           # nodemon
pnpm run prod          # node src/index.js
pnpm run migrate       # db-migrate up
pnpm run migrate:down  # revierte la última migración
pnpm run lint
pnpm run deploy        # install --frozen-lockfile + migrate
```

### Frontend

```bash
pnpm run start         # Vite dev en :3000
pnpm run build         # build de producción en dist/
pnpm run prod          # previsualiza el build en :9445 (--strictPort: falla si está ocupado)
pnpm run lint
pnpm run deploy        # install --frozen-lockfile + build
```

---

## Roles y permisos

### Organización

**Tenant** (empresa del grupo) → **usuarios**. **Facility** (instalación, con color propio) →
**salas** (capacidad, `needsValidation` y `api_token` de su pantalla).

### Cómo se decide lo que puede hacer cada uno

- Cada usuario tiene **un rol** (`users.role`) y, además, **permisos propios**.
- Sus permisos efectivos son los del rol más los propios. El `Admin` los tiene todos sin asignarlos.
- Los permisos tienen la forma `modulo.accion` y algunos incluyen otros: dar «Validar reservas» da
  también «Editar y borrar reservas de otros».
- Se leen de la base de datos en cada petición: un cambio surte efecto al momento, sin cerrar la sesión.
- Solo el `Admin` gestiona roles (**Administración › Roles y permisos**) y asigna permisos propios
  (desde la ficha del usuario).

| Rol | Tipo | Permisos por defecto |
|---|---|---|
| `Admin` | Sistema | Todos. Además, es el único que gestiona roles, asigna permisos y cambia el rol de un usuario |
| `Gestor` | Sistema | Reservar sin validación, editar y borrar reservas aprobadas de otros, ver y gestionar usuarios de su empresa |
| `User` | Sistema | Ninguno: reserva y gestiona lo suyo |
| Propios | Creados por el Admin | Los que se elijan. Se borran solo si no tienen usuarios |

Los roles de sistema no se renombran ni se borran. Nadie puede cambiar su propio rol, ni siquiera el
`Admin`.

### Catálogo de permisos

El catálogo vive solo en `backend/src/utils/permissions.js`. La pantalla lo pinta sola: para añadir un
permiso basta con añadirlo ahí.

| Área | Módulo | Permiso | Qué permite |
|---|---|---|---|
| Reservas | Reservas de salas | `bookings.auto_approve` | Sus reservas se aprueban solas también en salas con validación |
| | | `bookings.manage` | Editar y borrar reservas **aprobadas** de otros |
| | | `bookings.validate` | Aprobar o rechazar pendientes; ve «Validar reservas» y el contador (incluye `manage`) |
| | Salas y edificios | `rooms.manage` | Alta, edición y baja de salas y edificios (solo API por ahora) |
| Recepción | Llamadas | `calls.view` · `calls.write` | Reservados para el módulo de Llamadas (aún no existe) |
| | Visitas | `visits.view` | Consultar visitas |
| | | `visits.manage` | Dar de alta y gestionar visitas: escribe en Odoo (incluye `view`) |
| Administración | Usuarios | `users.view` | Ver los usuarios de su empresa |
| | | `users.manage` | Crear, editar y deshabilitar usuarios de su empresa (incluye `view`) |
| | | `users.all_companies` | Lo mismo en todas las empresas, y cambiarles la empresa (incluye `manage`) |

**Gestión de usuarios sin ser Admin:**
- Quien tiene `users.manage` nunca elige rol ni permisos: crea siempre como `User`.
- No puede tocar a administradores ni a otros que gestionen usuarios.
- Cada uno puede editar su nombre, su correo y su contraseña, pero no su rol ni su empresa.
- Los usuarios **no se borran**, porque sus reservas dependen de ellos: se deshabilitan, y al hacerlo
  se cierran sus sesiones.

**Dónde se comprueba:**
- Backend: `can('visits.view')` tras `AuthMiddleware`, y el resto de reglas en los controladores.
- Frontend: `meta.permission` en la ruta (con `permissionGuard`) y `can` / `canAny` de `utils/permissions.js`.
- El frontend solo oculta: quien manda es siempre el backend.

---

## Reservas

### Ciclo de una reserva

```text
        sala con needsValidation y sin bookings.auto_approve
  alta ─────────────────────────────────────────────────────►  Pending ──► Approved / Rejected (bookings.validate)
    │                                                               ▲
    └── bookings.auto_approve o sala sin validación ──► Approved ───┘ rechaza las Pending que se solapan
```

- Al **aprobar**, las `Pending` que se solapan en la misma sala pasan a `Rejected`, y el autor de
  cada reserva aprobada o rechazada recibe un correo.
- No se aceptan reservas en el pasado ni solapadas con una aprobada (o con una pendiente del mismo
  usuario).
- **Quién edita y borra:** el dueño. Con `bookings.validate`, cualquier reserva. Con `bookings.manage`,
  las aprobadas de otros. No hay límite de empresa.
- **Estado al editar:** solo `bookings.validate` cambia el estado. Si edita alguien sin
  `bookings.auto_approve` ni `bookings.validate`, en una sala con validación la reserva vuelve a `Pending`.
- La **reserva en bloque** (`POST /api/bookings/bulk`) va en una transacción: o entran todas o
  ninguna.

---

## Recepción: visitas

Pantalla **Recepción › Visitas** (`/reception/visits`).
- **Pestaña de hoy:** visitas del día y quién está dentro, con el recuento para evacuación.
- **Agenda:** visitas pasadas y futuras.
- **Fichas:** alta de visitas con varios visitantes, entradas, salidas, cancelaciones, aviso al
  anfitrión y firma por QR o tablet.

- **Datos en Odoo**, no en MySQL: `x_visita` es la cabecera y `frontdesk.visitor` guarda una ficha
  por persona. La lógica está en `backend/src/utils/visitsOdoo.js` y las rutas en `/api/reception`.
- **Las escrituras son reales**: las reglas de Odoo mandan la información previa, la firma y el aviso
  al anfitrión. Por eso, en local siempre se trabaja contra el Odoo de pruebas.
- **Varios puestos a la vez**: cada escritura avisa por WebSocket a los puestos de recepción
  conectados para que recarguen. La pantalla recarga además cada minuto, porque lo que entra por el
  kiosco de Odoo no avisa.
- Cada escritura deja una línea `[VISITAS]` en el log de PM2.
- **Pendiente:** el estado de presencia de los anfitriones, a falta de decidir dónde vive.

---

## Integraciones

### Pantallas de sala (`/api/v0`)

Cada sala tiene un `api_token` para su pantalla de puerta:

```text
GET /api/v0/rooms/:uuid
Authorization: <api_token de la sala>
```

Devuelve el nombre y color de la sala, la fecha y hora del servidor, la reunión en curso y la
siguiente del día. Es una API heredada (`models/Legacy/`): su formato no se cambia sin actualizar
las pantallas. Una sala sin `api_token` responde 403.

### Odoo (Recepción)

- **Conexión:** API JSON-2 de Odoo 19 con `fetch`. Cada llamada es `POST /json/2/<modelo>/<método>`,
  con la API key como bearer y la base en `X-Odoo-Database`.
- **Ficheros:**
  - `connections/odoo.js` es el cliente: aplica el timeout y reintenta solo las lecturas.
  - `utils/odooAdapter.js` lanza las operaciones con el contexto del portal (`search`, `read`,
    `create`, `call`…).
  - Los módulos construyen encima de ese adaptador.
- `/api/ready` vigila Odoo como servicio **no crítico**: si cae, el portal sigue en `degraded`.

### Tiempo real (Socket.IO)

- **Dónde:** en el mismo puerto que la API, bajo `/api/socket.io`. Solo acepta sesiones del portal.
- **Salas:** cada conexión entra en `user:<uuid>` y en la sala de cada módulo que puede ver (`calls`,
  `visits`).
- **Permisos:** las salas se recalculan cada minuto, así que dar o quitar un permiso se nota sin
  reconectar. Un usuario deshabilitado recibe `session:expired` y se le desconecta.
- **Uso:** el backend emite con `emitToRoom` o `emitToUser`. En el frontend, `useSocketStore`
  (conectado desde `layout.vue`) da `on(evento, fn)`.

---

## Base de datos y migraciones

La base de datos se llama **`kg_portal`** y es exclusiva del proyecto, por eso las tablas no llevan
prefijo. Migraciones con [`db-migrate`](https://db-migrate.readthedocs.io/) 1.x en `backend/migrations/`.

```bash
cd backend && pnpm run migrate
```

**Ejecútalo siempre después de traer cambios**: `pnpm run deploy` lo incluye, un `git pull` no. La
primera ejecución con db-migrate 1.x crea la tabla `migrations_state`.

| Tabla | Contenido |
|---|---|
| `tenants` | Empresas del grupo |
| `users` | Usuarios (`role` → `roles.code`, `tenant_uuid`, `active`, contraseña con bcrypt) |
| `roles` | Roles (`code`, `name`, `system` para los de sistema) |
| `role_permissions` | Permisos por defecto de cada rol |
| `user_permissions` | Permisos propios de cada usuario |
| `facilities` | Instalaciones y su color |
| `rooms` | Salas (`needsValidation`, `api_token`) |
| `bookings` | Reservas (fecha y hora de inicio y fin, `status`) |

`system` es palabra reservada en MySQL 8: en `roles` va siempre entre comillas invertidas.

Las tablas llevan `id` autoincremental, `uuid` como identificador externo y `create_ts` /
`updated_ts`. Se relacionan **por `uuid`**, con borrado en cascada.

Las migraciones antiguas crean las tablas con el prefijo `kibooking_` y `DropKibookingPrefix` lo
quita: así sirven igual para una base nueva y para una existente. No se editan migraciones ya
aplicadas. El paso de la base antigua a `kg_portal` en el servidor está en
[`docs/MIGRACION-BD-KG_PORTAL.md`](docs/MIGRACION-BD-KG_PORTAL.md).

---

## Convenciones del proyecto

### 1. SQL siempre parametrizado

`mysqlAdapter.query(sql, params)` con `?`. **Nunca** se interpolan valores en el SQL, aunque vengan
de la base de datos.

### 2. Ruta → Controlador → Modelo

Rutas sin lógica, controladores con la validación de permisos y la respuesta HTTP, y modelos con el
SQL. Los modelos se instancian con su uuid: `new Booking(uuid).read()`.

### 3. El usuario sale de la sesión

La identidad viene siempre de `res.locals.user` (rellenado por `AuthMiddleware`), nunca del body.

### 4. Permisos, no roles

El código no compara con `Gestor` ni `User`: todo va por permisos (`can(...)`). Solo se mira `Admin`,
que lo tiene todo.

### 5. Frontend: todo por `Request`

Toda llamada HTTP pasa por `src/model/request.js`, que añade el token y gestiona los errores: un
`401` limpia la sesión y vuelve al login.

### 6. Vuetify 4 — tema claro y API vigente

El tema está fijado a `light` en `main.js` (Vuetify 4 sigue por defecto el del sistema y la app solo
está diseñada en claro). Antes de usar un prop, compruébalo en la documentación de la versión
instalada.

---

## Calidad y dependencias

```bash
pnpm run lint
```

Debe salir **0 errores**. Hay avisos preexistentes; no añadas más.

Los `pnpm-lock.yaml` de `backend/` y `frontend/` **están versionados** y los `deploy` usan
`--frozen-lockfile`: si no cuadran con el `package.json`, el deploy falla en vez de resolver otras
versiones. Tras cambiar dependencias, sube el lockfile con el `package.json`.

Las compilaciones nativas permitidas se declaran en `allowBuilds` del `pnpm-workspace.yaml` de cada
servicio.

---

## Producción

Ubuntu + Apache + PM2, en `/var/www/KG_PORTAL`. Comparte servidor con Client360: puertos y
nombres de proceso propios para no pisarlo.

| Proceso PM2 | Ruta | Comando | Puerto |
|---|---|---|---|
| `KG_00_Backend` | `/var/www/KG_PORTAL/backend` | `node src/index.js` (directo, para que le llegue SIGINT) | `3445` |
| `KG_01_Frontend` | `/var/www/KG_PORTAL/frontend` | `pnpm run prod` | `9445` |

Ocupados en el servidor: `3443`/`9443` (Client360), `5000`, `5001`, `8000`, MySQL y Redis. Antes de
cambiar un puerto, compruébalo con `sudo ss -tlnp`. MySQL y Redis están en el mismo servidor.

> Nunca `pm2 delete all` ni `pm2 restart all`: afectan a los procesos de Client360.

### Despliegue

```bash
cd /var/www/KG_PORTAL && pnpm run deploy
```

```bash
pm2 reload /var/www/KG_PORTAL/ecosystem.config.js --update-env && pm2 save
```

> `--update-env` es obligatorio: sin él PM2 no recoge los cambios del `.env`.

### Apache y WebSocket

El proxy de `/api/` debe permitir WebSocket para el tiempo real. Hace falta Apache 2.4.47 o superior
con `mod_proxy_wstunnel`:

```apache
ProxyPass        /api/ http://127.0.0.1:3445/api/ upgrade=websocket
ProxyPassReverse /api/ http://127.0.0.1:3445/api/
```

Sin `upgrade=websocket`, Socket.IO cae a *long polling*: funciona, pero con más peticiones.

### Estado

`GET /api/ready` es la ruta de estado, pública y con el contrato común de las plataformas (la vigila Servidores de
INTARCON Tools).
- Responde siempre JSON con `status` (`ok`, `degraded`, o `down` con 503), `version` (la de `VERSION`) y `checks`.
- Comprueba MySQL, Redis y SMTP, que son críticos, y que se pueda escribir en la carpeta de logs.
  Si Odoo está configurado, lo vigila como no crítico.
- Una vigilancia en segundo plano los comprueba cada 30 s (SMTP y logs, cada 5 min) y la ruta solo lee el estado.
- URL para Servidores: `https://prt.keytergroup.com/api/ready`.

```bash
curl http://127.0.0.1:3445/api/ready
```

### Logs

```bash
pm2 logs KG_00_Backend --lines 200
```

El backend escribe además en `backend/logs/` con rotación diaria (14 días).

---

## Troubleshooting

### El backend se cae al arrancar con un error de MySQL

`connections/mysql.js` comprueba la conexión al iniciar y lanza el error si falla. Revisa `DB_*` en
el `.env` y que la base sea accesible.

### Todas las peticiones del frontend dan 404

`VITE_API_URL` sin `/api/` al final. El cliente concatena la URL base con el endpoint
(`users/sign-in`).

### Nadie puede iniciar sesión, o todos vuelven al login

Redis no responde o `SECRET_KEY_CACHE` ha cambiado: el backend no encuentra la sesión y responde
`401`, que en el frontend cierra la sesión.

### Los correos no llegan o los enlaces apuntan a otro sitio

Revisa `SMTP_*` (`SMTP_SECURE` es `true` o `false` como texto) y `APP_URL`, que es la base de los
enlaces de recuperación de contraseña.

### Vistas en blanco o errores de columna tras traer cambios

Faltan migraciones:

```bash
cd backend && pnpm run migrate
```

### Un usuario no ve un módulo o recibe «No tienes permiso»

Revisa en **Administración › Usuarios** sus permisos efectivos, que son los de su rol más los
propios. Los cambios cuentan desde la siguiente petición; el menú se actualiza al recargar la página.

### Visitas: «Odoo no ha respondido»

`ODOO_*` incompletas, Odoo caído o un fallo en la llamada. El detalle queda en el log como
`[VISITAS] …`, y `/api/ready` muestra el estado de Odoo.

### Los demás puestos de recepción no se actualizan al momento

El WebSocket no llega: revisa `upgrade=websocket` en Apache. Sin él, Socket.IO usa *long polling*.
Igualmente, la pantalla recarga cada minuto.

### `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR` · «Acceso denegado»

Un `node_modules` a medio borrar. Bórralo a mano y repite:

```bash
rm -rf node_modules && pnpm install
```

---

## Documentación

Toda la documentación `.md` vive en [`docs/`](docs). En la raíz solo están este README y
`CLAUDE.md`.

| Documento | Contenido |
|---|---|
| [`docs/MIGRACION-BD-KG_PORTAL.md`](docs/MIGRACION-BD-KG_PORTAL.md) | Paso de la base antigua a `kg_portal` y tablas sin prefijo (pendiente en el servidor) |
| [`docs/AUDITORIA-2026-10.md`](docs/AUDITORIA-2026-10.md) | Hallazgos de seguridad, datos y calidad con su estado, el plan de acción y el despliegue HTTPS |

`CLAUDE.md` recoge estas mismas convenciones en el formato que consume
[Claude Code](https://claude.com/claude-code).

---

Software propietario de INTARCON. Uso interno.
